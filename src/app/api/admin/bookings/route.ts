import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { enrichBookings, type BookingRow } from "@/lib/bookingQueries";

// GET /api/admin/bookings?status=booked|completed|cancelled|all
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const status = new URL(req.url).searchParams.get("status") ?? "all";

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookings = await enrichBookings((data ?? []) as BookingRow[]);
  return NextResponse.json(
    status === "all" ? bookings : bookings.filter((b) => b.meta.status === status)
  );
}
