import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { bookingFromRow } from "@/lib/bookingMeta";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const [patients, doctors, hospitals, bookings] = await Promise.all([
    supabaseAdmin.from("patients").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("doctors").select("approved, rejected_at"),
    supabaseAdmin.from("hospitals").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("bookings").select("*"),
  ]);

  const doctorRows = doctors.data ?? [];
  const bookingMeta = (bookings.data ?? []).map((row) => bookingFromRow(row).meta);

  const revenue = bookingMeta
    .filter((meta) => meta.paymentStatus === "paid")
    .reduce((sum, meta) => sum + (meta.amount ?? 0), 0);

  return NextResponse.json({
    patients: patients.count ?? 0,
    hospitals: hospitals.count ?? 0,
    doctors: {
      approved: doctorRows.filter((d) => d.approved === true).length,
      pending: doctorRows.filter((d) => d.approved !== true && !d.rejected_at).length,
      rejected: doctorRows.filter((d) => d.approved !== true && d.rejected_at).length,
    },
    bookings: {
      total: bookingMeta.length,
      booked: bookingMeta.filter((m) => m.status === "booked").length,
      completed: bookingMeta.filter((m) => m.status === "completed").length,
      cancelled: bookingMeta.filter((m) => m.status === "cancelled").length,
      paid: bookingMeta.filter((m) => m.paymentStatus === "paid").length,
    },
    revenuePaise: revenue,
  });
}
