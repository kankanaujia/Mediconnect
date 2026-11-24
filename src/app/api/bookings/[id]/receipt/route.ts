import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingFromRow } from "@/lib/bookingMeta";
import { generateReceiptPdf } from "@/lib/receiptPdf";
import { canAccessBooking, forbidden, getSession, unauthorized } from "@/lib/session";

export async function GET(
  _req: Request,
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

  const [patientResult, doctorResult, hospitalResult] = await Promise.all([
    supabaseAdmin.from("patients").select("name").eq("id", booking.patient_id).single(),
    supabaseAdmin.from("doctors").select("name").eq("id", booking.doctor_id).single(),
    supabaseAdmin
      .from("hospitals")
      .select("name")
      .eq("id", booking.hospital_id)
      .single(),
  ]);

  const parsed = bookingFromRow(booking);
  const pdf = generateReceiptPdf({
    receiptId: parsed.meta.receiptId ?? `receipt-${id}`,
    patientName: patientResult.data?.name ?? "Patient",
    doctorName: doctorResult.data?.name ?? "Doctor",
    hospitalName: hospitalResult.data?.name ?? "Hospital",
    appointmentDate: booking.appointment_date,
    appointmentTime: booking.appointment_time,
    amount: parsed.meta.amount ?? 0,
    currency: parsed.meta.currency ?? "INR",
    paymentId: parsed.meta.paymentId,
    bookingType: parsed.meta.kind === "special" ? "Special Appointment" : "Daily Slot",
    status: parsed.meta.status,
    refundId: parsed.meta.refundId,
    refundStatus: parsed.meta.refundStatus,
    cancelledAt: parsed.meta.cancelledAt,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mediconnect-receipt-${id}.pdf"`,
    },
  });
}
