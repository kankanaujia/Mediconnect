import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession, unauthorized } from "@/lib/session";
import { shapePatient, type PatientRow } from "@/lib/patientProfile";
import { enrichBookings, type BookingRow } from "@/lib/bookingQueries";

// Everything MediConnect stores about the logged-in patient, as a JSON download.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "patient") return unauthorized();

  const [patient, bookings, reviews, accessLog] = await Promise.all([
    supabaseAdmin.from("patients").select("*").eq("id", session.id).single(),
    supabaseAdmin.from("bookings").select("*").eq("patient_id", session.id).order("appointment_date"),
    supabaseAdmin.from("reviews").select("booking_id, rating, comment, created_at").eq("patient_id", session.id),
    supabaseAdmin
      .from("access_logs")
      .select("actor_role, actor_name, action, created_at")
      .eq("patient_id", session.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!patient.data) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const enriched = await enrichBookings((bookings.data ?? []) as BookingRow[]);
  const exportData = {
    exported_at: new Date().toISOString(),
    profile: {
      ...shapePatient(patient.data as PatientRow),
      consent_at: patient.data.consent_at ?? null,
      created_at: patient.data.created_at ?? null,
    },
    appointments: enriched.map((b) => ({
      date: b.appointment_date,
      time: b.appointment_time,
      doctor: b.doctor_name,
      specialization: b.specialization,
      hospital: b.hospital_name,
      reason: b.reason,
      status: b.meta.status,
      payment_status: b.meta.paymentStatus,
      amount_paise: b.meta.amount ?? null,
      refund_id: b.meta.refundId ?? null,
    })),
    reviews: reviews.data ?? [],
    who_viewed_my_data: accessLog.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mediconnect-my-data.json"`,
    },
  });
}
