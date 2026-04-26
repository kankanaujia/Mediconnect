import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseBookingReason, serializeBookingReason } from "@/lib/bookingMeta";
import { sendBookingConfirmationSms, scheduleBookingReminders } from "@/lib/sms";
import { parsePatientAddress } from "@/lib/patientProfile";

function getRazorpayConfig() {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return null;
  }

  return { keySecret };
}

export async function POST(req: Request) {
  const config = getRazorpayConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Configure RAZORPAY_KEY_SECRET." },
      { status: 500 }
    );
  }

  const {
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = (await req.json()) as {
    bookingId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const parsed = parseBookingReason(booking.reason);
  const expected = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const [patientResult, doctorResult] = await Promise.all([
    supabaseAdmin.from("patients").select("*").eq("id", booking.patient_id).single(),
    supabaseAdmin
      .from("doctors")
      .select("name")
      .eq("id", booking.doctor_id)
      .single(),
  ]);

  const patient = patientResult.data as
    | { name: string; phone: string; address: string }
    | null;
  const patientProfile = patient ? parsePatientAddress(patient.address) : null;
  const doctorName = doctorResult.data?.name ?? "Doctor";

  let confirmation: { sid: string } | null = null;
  let reminders: Array<{ sid: string; sendAt: string; label: string }> = [];

  try {
    confirmation = patient?.phone
      ? await sendBookingConfirmationSms({
          phone: patient.phone,
          patientName: patient.name,
          doctorName,
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time,
        })
      : null;

    reminders = patient?.phone
      ? await scheduleBookingReminders({
          phone: patient.phone,
          patientName: patient.name,
          doctorName,
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time,
        })
      : [];
  } catch {
    confirmation = null;
    reminders = [];
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      reason: serializeBookingReason(parsed.reason, {
        ...parsed.meta,
        paymentStatus: "paid",
        paymentOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        notifications: {
          confirmationSid: confirmation?.sid,
          reminders,
        },
      }),
    })
    .eq("id", bookingId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message || "Failed to update payment status" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      bookingId,
      paymentStatus: "paid",
      receiptId: parsed.meta.receiptId,
      patientLocation: patientProfile?.location ?? "",
    },
    { status: 200 }
  );
}
