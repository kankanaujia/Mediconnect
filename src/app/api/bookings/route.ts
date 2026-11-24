import { NextResponse } from "next/server";
import { supabaseAdmin, isUsingServiceRole } from "@/lib/supabaseAdmin";
import {
  bookingFromRow,
  bookingColumns,
  type BookingStatus,
} from "@/lib/bookingMeta";
import { getBookingAmount, bookingCurrency } from "@/lib/paymentConfig";
import { enrichBookings, sameClockTime, type BookingRow } from "@/lib/bookingQueries";
import { sendPaymentPendingSms } from "@/lib/bookingNotifications";
import { sendBookingReservedEmail } from "@/lib/bookingEmails";
import { appBaseUrl } from "@/lib/email";
import {
  canAccessBooking,
  forbidden,
  getSession,
  unauthorized,
} from "@/lib/session";

// Only what other users need to work out which times are free.
function toAvailability(row: BookingRow) {
  const parsed = bookingFromRow(row);
  return {
    id: row.id,
    doctor_id: row.doctor_id,
    appointment_date: row.appointment_date,
    appointment_time: row.appointment_time,
    meta: {
      kind: parsed.meta.kind,
      status: parsed.meta.status,
      slotId: parsed.meta.slotId,
    },
  };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const doctor_id = searchParams.get("doctor_id");
  const patient_id = searchParams.get("patient_id");
  const booking_id = searchParams.get("booking_id");

  if (!doctor_id && !patient_id && !booking_id) {
    return NextResponse.json(
      { error: "doctor_id, patient_id or booking_id is required" },
      { status: 400 }
    );
  }

  if (patient_id && !(session.role === "patient" && session.id === patient_id)) {
    return forbidden();
  }

  let query = supabaseAdmin.from("bookings").select("*").order("appointment_date");

  if (doctor_id) {
    query = query.eq("doctor_id", doctor_id);
  }

  if (patient_id) {
    query = query.eq("patient_id", patient_id);
  }

  if (booking_id) {
    query = query.eq("id", booking_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as BookingRow[];
  const own = rows.filter((row) => canAccessBooking(session, row));

  // Any logged-in user can check a doctor's calendar, but bookings the caller
  // is not part of come back without patient details.
  if (doctor_id && !patient_id && !booking_id) {
    const enrichedOwn = await enrichBookings(own);
    const ownById = new Map(enrichedOwn.map((row) => [row.id, row]));
    return NextResponse.json(
      rows.map((row) => ownById.get(row.id) ?? toAvailability(row)),
      { status: 200 }
    );
  }

  const bookings = await enrichBookings(own);
  return NextResponse.json(bookings, { status: 200 });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "patient") {
    return unauthorized("Please log in as a patient to book.");
  }

  const body = await req.json();
  const kind = body.kind === "special" ? "special" : "daily";

  const { data: doctorRow } = await supabaseAdmin
    .from("doctors")
    .select("id, hospital_id")
    .eq("id", body.doctor_id)
    .maybeSingle();

  if (!doctorRow) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const bookingData = bookingColumns(body.reason ?? "", {
    kind,
    slotId: body.slot_id,
    status: "booked",
    paymentStatus: "pending",
    amount: getBookingAmount(kind),
    currency: bookingCurrency,
  });

  let claimedSlotId: string | null = null;
  const releaseClaimedSlot = async () => {
    if (claimedSlotId) {
      await supabaseAdmin.from("slots").update({ is_booked: false }).eq("id", claimedSlotId);
    }
  };

  if (kind === "daily" && body.slot_id) {
    // Claim the slot with one conditional update so two patients cannot both
    // book it at the same moment.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("slots")
      .update({ is_booked: true })
      .eq("id", body.slot_id)
      .eq("doctor_id", body.doctor_id)
      .eq("is_booked", false)
      .select("id");

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        { error: "This slot has already been booked." },
        { status: 409 },
      );
    }

    claimedSlotId = body.slot_id;
  }

  const { data: existingData } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("doctor_id", body.doctor_id)
    .eq("appointment_date", body.appointment_date);

  const existing = ((existingData ?? []) as BookingRow[]).find((row) => {
    const parsed = bookingFromRow(row);
    const sameTime = sameClockTime(row.appointment_time, body.appointment_time);
    const sameSlot = body.slot_id && parsed.meta.slotId === body.slot_id;
    return parsed.meta.status === "booked" && (sameTime || sameSlot);
  });

  if (existing) {
    await releaseClaimedSlot();
    return NextResponse.json(
      { error: "This slot has already been booked." },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert([
      {
        patient_id: session.id,
        doctor_id: doctorRow.id,
        hospital_id: doctorRow.hospital_id ?? body.hospital_id,
        appointment_date: body.appointment_date,
        appointment_time: body.appointment_time,
        ...bookingData,
      },
    ])
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      // Unique index: someone else booked this doctor at this time first.
      await releaseClaimedSlot();
      return NextResponse.json({ error: "This slot has already been booked." }, { status: 409 });
    }
    await releaseClaimedSlot();
    return NextResponse.json(
      {
        error:
          error?.code === "42501" && !isUsingServiceRole()
            ? "Booking creation is blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to server env."
            : error?.message || "Failed to create booking",
      },
      { status: 500 }
    );
  }

  // Payment is still pending: tell the patient by SMS and email. Failures never block the booking.
  await Promise.all([
    sendPaymentPendingSms(data).catch(() => null),
    sendBookingReservedEmail(data, appBaseUrl(req)).catch(() => null),
  ]);

  const [booking] = await enrichBookings([data as BookingRow]);
  return NextResponse.json(booking, { status: 200 });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const body = await req.json();
  const {
    id,
    status,
    meta,
    reason,
    appointment_date,
    appointment_time,
  } = body as {
    id: string;
    status?: BookingStatus;
    meta?: Record<string, unknown>;
    reason?: string;
    appointment_date?: string;
    appointment_time?: string;
  };

  const { data: current, error: currentError } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (!canAccessBooking(session, current as BookingRow)) {
    return forbidden();
  }

  // Only the doctor can change the status, and only to "completed".
  // Cancelling goes through /api/bookings/[id]/cancel so the refund happens.
  if (status !== undefined && (session.role !== "doctor" || status !== "completed")) {
    return forbidden("Only the doctor can mark an appointment completed.");
  }

  // Clients may only move a booking to another slot. Payment, amount, receipt
  // and notification fields are set by the server alone.
  const nextSlotId =
    meta && typeof meta.slotId === "string" ? meta.slotId : undefined;

  const parsed = bookingFromRow(current as BookingRow);

  if (parsed.meta.status !== "booked") {
    return NextResponse.json(
      { error: `This booking is ${parsed.meta.status} and can no longer be changed.` },
      { status: 409 }
    );
  }
  const prevSlotId = typeof parsed.meta.slotId === "string" ? parsed.meta.slotId : undefined;

  const nextDate = appointment_date ?? current.appointment_date;
  const nextTime = appointment_time ?? current.appointment_time;

  if (appointment_date || appointment_time || nextSlotId) {
    const { data: sameDoctorData } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("doctor_id", current.doctor_id)
      .eq("appointment_date", nextDate);

    const candidateSlotId = nextSlotId ?? parsed.meta.slotId;
    const conflict = ((sameDoctorData ?? []) as BookingRow[]).find((row) => {
      if (row.id === id) {
        return false;
      }

      const rowParsed = bookingFromRow(row);
      const sameTime = sameClockTime(row.appointment_time, nextTime);
      const sameSlot = candidateSlotId && rowParsed.meta.slotId === candidateSlotId;

      return rowParsed.meta.status === "booked" && (sameTime || sameSlot);
    });

    if (conflict) {
      return NextResponse.json(
        { error: "That new appointment slot is already taken." },
        { status: 409 }
      );
    }
  }

  const movingSlot =
    parsed.meta.kind === "daily" && prevSlotId && nextSlotId && prevSlotId !== nextSlotId;

  if (movingSlot) {
    const { data: claimed } = await supabaseAdmin
      .from("slots")
      .update({ is_booked: true })
      .eq("id", nextSlotId)
      .eq("doctor_id", current.doctor_id)
      .eq("is_booked", false)
      .select("id");

    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        { error: "That new appointment slot is already taken." },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({
      appointment_date: nextDate,
      appointment_time: nextTime,
      ...bookingColumns(reason ?? parsed.reason, {
        ...parsed.meta,
        ...(nextSlotId ? { slotId: nextSlotId } : {}),
        status: status ?? parsed.meta.status,
      }),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      // Unique index: someone else booked this doctor at this time first.
      if (movingSlot) {
        await supabaseAdmin.from("slots").update({ is_booked: false }).eq("id", nextSlotId);
      }
      return NextResponse.json({ error: "This slot has already been booked." }, { status: 409 });
    }
    if (movingSlot) {
      await supabaseAdmin.from("slots").update({ is_booked: false }).eq("id", nextSlotId);
    }
    return NextResponse.json(
      { error: error?.message || "Failed to update booking" },
      { status: 500 }
    );
  }

  if (movingSlot) {
    await supabaseAdmin.from("slots").update({ is_booked: false }).eq("id", prevSlotId);
  }

  const [booking] = await enrichBookings([data as BookingRow]);
  return NextResponse.json(booking, { status: 200 });
}
