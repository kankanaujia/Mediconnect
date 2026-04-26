import { NextResponse } from "next/server";
import { supabaseAdmin, isUsingServiceRole } from "@/lib/supabaseAdmin";
import {
  parseBookingReason,
  serializeBookingReason,
  type BookingStatus,
} from "@/lib/bookingMeta";
import { getBookingAmount, bookingCurrency } from "@/lib/paymentConfig";
import { parsePatientAddress } from "@/lib/patientProfile";

type BookingRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
};

async function enrichBookings(rows: BookingRow[]) {
  const patientIds = [...new Set(rows.map((row) => row.patient_id).filter(Boolean))];
  const doctorIds = [...new Set(rows.map((row) => row.doctor_id).filter(Boolean))];
  const hospitalIds = [...new Set(rows.map((row) => row.hospital_id).filter(Boolean))];

  const [patientsResult, doctorsResult, hospitalsResult] = await Promise.all([
    patientIds.length
      ? supabaseAdmin
          .from("patients")
          .select("id, name, email, phone, address")
          .in("id", patientIds)
      : Promise.resolve({ data: [], error: null }),
    doctorIds.length
      ? supabaseAdmin
          .from("doctors")
          .select("id, name, specialization, hospital_id")
          .in("id", doctorIds)
      : Promise.resolve({ data: [], error: null }),
    hospitalIds.length
      ? supabaseAdmin
          .from("hospitals")
          .select("id, name, location")
          .in("id", hospitalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const patientMap = new Map(
    (patientsResult.data ?? []).map((patient) => [patient.id, patient])
  );
  const doctorMap = new Map(
    (doctorsResult.data ?? []).map((doctor) => [doctor.id, doctor])
  );
  const hospitalMap = new Map(
    (hospitalsResult.data ?? []).map((hospital) => [hospital.id, hospital])
  );

  return rows.map((row) => {
    const parsed = parseBookingReason(row.reason);
    const doctor = doctorMap.get(row.doctor_id);
    const hospital = hospitalMap.get(row.hospital_id);
    const patient = patientMap.get(row.patient_id);
    const patientProfile = patient ? parsePatientAddress(patient.address) : null;

    return {
      ...row,
      reason: parsed.reason,
      meta: parsed.meta,
      patient_name: patient?.name ?? "Patient",
      patient_phone: patient?.phone ?? "",
      patient_email: patient?.email ?? "",
      patient_location: patientProfile?.location ?? "",
      doctor_name: doctor?.name ?? "Doctor",
      specialization: doctor?.specialization ?? "",
      hospital_name: hospital?.name ?? "",
      hospital_location: hospital?.location ?? "",
    };
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctor_id = searchParams.get("doctor_id");
  const patient_id = searchParams.get("patient_id");
  const booking_id = searchParams.get("booking_id");

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

  const bookings = await enrichBookings((data ?? []) as BookingRow[]);
  return NextResponse.json(bookings, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json();
  const kind = body.kind === "special" ? "special" : "daily";
  const parsedReason = serializeBookingReason(body.reason ?? "", {
    kind,
    slotId: body.slot_id,
    status: "booked",
    paymentStatus: "pending",
    amount: getBookingAmount(kind),
    currency: bookingCurrency,
  });

  const { data: existingData } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("doctor_id", body.doctor_id)
    .eq("appointment_date", body.appointment_date);

  const existing = ((existingData ?? []) as BookingRow[]).find((row) => {
    const parsed = parseBookingReason(row.reason);
    const sameTime = row.appointment_time === body.appointment_time;
    const sameSlot = body.slot_id && parsed.meta.slotId === body.slot_id;
    return parsed.meta.status !== "completed" && (sameTime || sameSlot);
  });

  if (existing) {
    return NextResponse.json(
      { error: "This slot has already been booked." },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert([
      {
        patient_id: body.patient_id,
        doctor_id: body.doctor_id,
        hospital_id: body.hospital_id,
        appointment_date: body.appointment_date,
        appointment_time: body.appointment_time,
        reason: parsedReason,
      },
    ])
    .select("*")
    .single();

  if (error || !data) {
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

  const [booking] = await enrichBookings([data as BookingRow]);
  return NextResponse.json(booking, { status: 200 });
}

export async function PUT(req: Request) {
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

  const parsed = parseBookingReason((current as BookingRow).reason);

  const nextDate = appointment_date ?? current.appointment_date;
  const nextTime = appointment_time ?? current.appointment_time;

  if (
    appointment_date ||
    appointment_time ||
    (meta && Object.prototype.hasOwnProperty.call(meta, "slotId"))
  ) {
    const { data: sameDoctorData } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("doctor_id", current.doctor_id)
      .eq("appointment_date", nextDate);

    const conflict = ((sameDoctorData ?? []) as BookingRow[]).find((row) => {
      if (row.id === id) {
        return false;
      }

      const rowParsed = parseBookingReason(row.reason);
      const sameTime = row.appointment_time === nextTime;
      const nextSlotId =
        (meta && typeof meta.slotId === "string" ? meta.slotId : parsed.meta.slotId) ??
        undefined;
      const sameSlot = nextSlotId && rowParsed.meta.slotId === nextSlotId;

      return rowParsed.meta.status !== "completed" && (sameTime || sameSlot);
    });

    if (conflict) {
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
      reason: serializeBookingReason(reason ?? parsed.reason, {
        ...parsed.meta,
        ...meta,
        status: status ?? parsed.meta.status,
      }),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to update booking" },
      { status: 500 }
    );
  }

  const [booking] = await enrichBookings([data as BookingRow]);
  return NextResponse.json(booking, { status: 200 });
}
