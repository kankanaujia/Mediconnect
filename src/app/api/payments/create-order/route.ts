import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseBookingReason, serializeBookingReason } from "@/lib/bookingMeta";
import { bookingCurrency, getBookingAmount } from "@/lib/paymentConfig";

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
}

export async function POST(req: Request) {
  const config = getRazorpayConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 500 }
    );
  }

  const { bookingId } = (await req.json()) as { bookingId: string };

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const parsed = parseBookingReason(booking.reason);
  const amount = parsed.meta.amount ?? getBookingAmount(parsed.meta.kind);
  const receiptId = parsed.meta.receiptId ?? `rcpt_${randomUUID().slice(0, 8)}`;

  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: bookingCurrency,
      receipt: receiptId,
      notes: {
        booking_id: bookingId,
        booking_kind: parsed.meta.kind,
      },
    }),
  });

  const order = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: order.error?.description || "Failed to create Razorpay order" },
      { status: 500 }
    );
  }

  await supabaseAdmin
    .from("bookings")
    .update({
      reason: serializeBookingReason(parsed.reason, {
        ...parsed.meta,
        paymentStatus: "pending",
        paymentOrderId: order.id,
        amount,
        currency: bookingCurrency,
        receiptId,
      }),
    })
    .eq("id", bookingId);

  return NextResponse.json(
    {
      keyId: config.keyId,
      amount,
      currency: bookingCurrency,
      orderId: order.id,
      receiptId,
      bookingId,
    },
    { status: 200 }
  );
}
