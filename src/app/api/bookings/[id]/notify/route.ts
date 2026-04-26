import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseBookingReason, serializeBookingReason } from "@/lib/bookingMeta";
import { sendNotificationsForBooking } from "@/lib/bookingNotifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const parsed = parseBookingReason(booking.reason);
  const notificationResult = await sendNotificationsForBooking(booking);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      reason: serializeBookingReason(parsed.reason, {
        ...parsed.meta,
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
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message || "Failed to update booking notifications" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      notificationError: notificationResult.error,
      confirmationSid: notificationResult.confirmation?.sid,
    },
    { status: 200 }
  );
}
