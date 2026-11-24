import { NextResponse } from "next/server";
import { logPatientAccess } from "@/lib/accessLog";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHospital } from "@/lib/hospitalAuth";
import { enrichBookings, type BookingRow } from "@/lib/bookingQueries";

// GET /api/hospital/bookings?status=booked|completed|cancelled|all
export async function GET(req: Request) {
  const auth = await requireHospital();
  if (auth.response) return auth.response;

  const status = new URL(req.url).searchParams.get("status") ?? "all";

  let query = supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("hospital_id", auth.session.hid)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(500);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as BookingRow[];
  await logPatientAccess(
    auth.session,
    rows.map((row) => ({ patientId: row.patient_id, bookingId: row.id })),
    "Viewed appointment list (hospital)"
  );
  return NextResponse.json(await enrichBookings(rows));
}
