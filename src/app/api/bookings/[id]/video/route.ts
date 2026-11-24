import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingFromRow } from "@/lib/bookingMeta";
import { callWindow, videoRoomUrl } from "@/lib/videoCall";
import { getSession, unauthorized } from "@/lib/session";

// GET: the video-call link for a paid, upcoming booking. Only the booking's
// patient and doctor get it, and only while the call window is open.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const { data: booking } = await supabaseAdmin.from("bookings").select("*").eq("id", id).maybeSingle();

  const isParty =
    booking &&
    ((session.role === "patient" && booking.patient_id === session.id) ||
      (session.role === "doctor" && booking.doctor_id === session.id));
  if (!booking || !isParty) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const meta = bookingFromRow(booking).meta;
  if (meta.status !== "booked" || meta.paymentStatus !== "paid") {
    return NextResponse.json(
      { error: "Video calls are available for confirmed (paid) upcoming appointments." },
      { status: 409 }
    );
  }

  const window = callWindow(booking.appointment_date, booking.appointment_time);
  if (!window.open) {
    return NextResponse.json(
      {
        error: "The call is not open right now.",
        opensAt: window.opensAt.toISOString(),
        closesAt: window.closesAt.toISOString(),
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    url: videoRoomUrl(booking.id),
    opensAt: window.opensAt.toISOString(),
    closesAt: window.closesAt.toISOString(),
  });
}
