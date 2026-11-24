import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingFromRow, bookingColumns } from "@/lib/bookingMeta";
import { sendNotificationsForBooking } from "@/lib/bookingNotifications";
import { refundPayment } from "@/lib/razorpayServer";
import { sendBookingConfirmedEmail } from "@/lib/bookingEmails";
import { sendDoctorNewBookingAlert } from "@/lib/doctorAlerts";
import { appBaseUrl } from "@/lib/email";
import { forbidden, getSession, unauthorized } from "@/lib/session";

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

  const session = await getSession();
  if (!session) {
    return unauthorized();
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

  if (session.role !== "patient" || booking.patient_id !== session.id) {
    return forbidden();
  }

  const parsed = bookingFromRow(booking);
  const expected = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  // The signature only proves Razorpay issued this payment for this order;
  // also make sure the order is the one created for this booking.
  if (!parsed.meta.paymentOrderId || razorpay_order_id !== parsed.meta.paymentOrderId) {
    return NextResponse.json({ error: "Payment does not match this booking" }, { status: 400 });
  }

  if (
    typeof razorpay_signature !== "string" ||
    expected.length !== razorpay_signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))
  ) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // The booking was cancelled while the patient was paying: give the money back.
  if (parsed.meta.status !== "booked") {
    try {
      await refundPayment(razorpay_payment_id, parsed.meta.amount);
    } catch {
      return NextResponse.json(
        {
          error:
            "This booking was cancelled and the automatic refund failed. Please contact support with your payment ID.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "This booking was cancelled, so your payment has been refunded." },
      { status: 409 }
    );
  }

  const notificationResult = await sendNotificationsForBooking(booking);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      ...bookingColumns(parsed.reason, {
        ...parsed.meta,
        paymentStatus: "paid",
        paymentOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        notifications: {
          confirmationSid: notificationResult.confirmation?.sid,
          confirmationStatus: notificationResult.confirmation ? "accepted" : "not-sent",
          lastAttemptAt: new Date().toISOString(),
          error: notificationResult.error,
          reminders: notificationResult.reminders.map((reminder) => ({
            ...reminder,
            status: "scheduled",
          })),
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

  await Promise.all([
    sendBookingConfirmedEmail(updated, appBaseUrl(req)).catch(() => null),
    sendDoctorNewBookingAlert(updated, appBaseUrl(req)).catch(() => null),
  ]);

  return NextResponse.json(
    {
      bookingId,
      paymentStatus: "paid",
      receiptId: parsed.meta.receiptId,
      patientLocation: notificationResult.patientLocation,
      notificationError: notificationResult.error,
    },
    { status: 200 }
  );
}
