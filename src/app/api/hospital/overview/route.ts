import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHospital } from "@/lib/hospitalAuth";
import { bookingFromRow } from "@/lib/bookingMeta";

function istDate(offsetDays = 0) {
  return new Date(Date.now() + 5.5 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
}

// Numbers for the hospital panel's overview tab.
export async function GET() {
  const auth = await requireHospital();
  if (auth.response) return auth.response;
  const hid = auth.session.hid;

  const [hospital, doctors, bookings, requests] = await Promise.all([
    supabaseAdmin
      .from("hospitals")
      .select("id, name, location, address, phone_number, email, registration_number")
      .eq("id", hid)
      .single(),
    supabaseAdmin.from("doctors").select("id, approved, rejected_at").eq("hospital_id", hid),
    supabaseAdmin.from("bookings").select("*").eq("hospital_id", hid),
    supabaseAdmin
      .from("doctor_requests")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", hid)
      .eq("status", "pending"),
  ]);

  const rows = (bookings.data ?? []).map((row) => ({ row, meta: bookingFromRow(row).meta }));
  const today = istDate();
  const doctorRows = doctors.data ?? [];

  const next7 = Array.from({ length: 7 }, (_, i) => {
    const date = istDate(i);
    return {
      date,
      count: rows.filter((b) => b.row.appointment_date === date && b.meta.status === "booked").length,
    };
  });

  return NextResponse.json({
    hospital: hospital.data,
    doctors: {
      approved: doctorRows.filter((d) => d.approved === true).length,
      pending: doctorRows.filter((d) => d.approved !== true && !d.rejected_at).length,
    },
    bookings: {
      today: rows.filter((b) => b.row.appointment_date === today && b.meta.status === "booked").length,
      upcoming: rows.filter((b) => b.meta.status === "booked" && b.row.appointment_date >= today).length,
      completed: rows.filter((b) => b.meta.status === "completed").length,
      cancelled: rows.filter((b) => b.meta.status === "cancelled").length,
    },
    revenuePaise: rows
      .filter((b) => b.meta.paymentStatus === "paid")
      .reduce((sum, b) => sum + (b.meta.amount ?? 0), 0),
    pendingRequests: requests.count ?? 0,
    next7,
  });
}
