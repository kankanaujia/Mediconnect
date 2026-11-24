import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PATIENT_CANCEL_CUTOFF_HOURS,
  appointmentStart,
  bookingFromRow,
  bookingColumns,
} from "@/lib/bookingMeta";
import { refundPayment } from "@/lib/razorpayServer";
import { sendBookingCancelledEmails } from "@/lib/bookingEmails";
import { appBaseUrl } from "@/lib/email";
import { canAccessBooking, forbidden, getSession, unauthorized } from "@/lib/session";

// Cancels a booking, frees its slot and refunds the payment in full.
// Patients can cancel up to PATIENT_CANCEL_CUTOFF_HOURS before the appointment;
// doctors can cancel any booking that is not completed yet.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const { id } = await params;

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (!canAccessBooking(session, booking)) {
    return forbidden();
  }

  const parsed = bookingFromRow(booking);

  if (parsed.meta.status !== "booked") {
    return NextResponse.json(
      { error: `This booking is already ${parsed.meta.status}.` },
      { status: 409 }
    );
  }

  if (session.role === "patient") {
    const start = appointmentStart(booking.appointment_date, booking.appointment_time);
    const cutoff = start.getTime() - PATIENT_CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;
    if (Date.now() > cutoff) {
      return NextResponse.json(
        {
          error: `Appointments can only be cancelled up to ${PATIENT_CANCEL_CUTOFF_HOURS} hours before they start.`,
        },
        { status: 409 }
      );
    }
  }

  // Refund first: if Razorpay refuses, the booking stays as it is so the
  // patient's money is never stuck on a cancelled booking.
  let refund: { refundId: string; status: string } | null = null;
  if (parsed.meta.paymentStatus === "paid" && parsed.meta.paymentId) {
    try {
      refund = await refundPayment(parsed.meta.paymentId, parsed.meta.amount);
    } catch (refundError) {
      return NextResponse.json(
        {
          error: `Refund failed, booking not cancelled: ${
            refundError instanceof Error ? refundError.message : "unknown error"
          }`,
        },
        { status: 502 }
      );
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      ...bookingColumns(parsed.reason, {
        ...parsed.meta,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelledBy: session.role,
        ...(refund
          ? {
              paymentStatus: "refunded",
              refundId: refund.refundId,
              refundStatus: refund.status,
            }
          : {}),
      }),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }

  if (parsed.meta.kind === "daily" && parsed.meta.slotId) {
    await supabaseAdmin.from("slots").update({ is_booked: false }).eq("id", parsed.meta.slotId);
  }

  await sendBookingCancelledEmails(
    updated,
    { cancelledBy: session.role, refunded: Boolean(refund) },
    appBaseUrl(req)
  );

  return NextResponse.json(
    {
      id,
      status: "cancelled",
      refunded: Boolean(refund),
      refundId: refund?.refundId,
    },
    { status: 200 }
  );
}
