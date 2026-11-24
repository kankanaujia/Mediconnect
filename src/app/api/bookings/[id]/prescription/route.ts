import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingFromRow } from "@/lib/bookingMeta";
import { cleanPrescription } from "@/lib/prescriptions";
import { generatePrescriptionPdf } from "@/lib/prescriptionPdf";
import { logPatientAccess } from "@/lib/accessLog";
import { appBaseUrl, emailLayout, sendEmail } from "@/lib/email";
import { canAccessBooking, forbidden, getSession, unauthorized } from "@/lib/session";

async function loadBooking(id: string) {
  const { data } = await supabaseAdmin.from("bookings").select("*").eq("id", id).maybeSingle();
  return data;
}

// GET: the prescription as JSON, or as a PDF with ?format=pdf.
// Visible to the patient, the doctor, the hospital and admins.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const booking = await loadBooking(id);
  if (!booking || !canAccessBooking(session, booking)) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: prescription } = await supabaseAdmin
    .from("prescriptions")
    .select("*")
    .eq("booking_id", id)
    .maybeSingle();

  if (!prescription) {
    return NextResponse.json({ error: "No prescription yet" }, { status: 404 });
  }

  await logPatientAccess(session, [{ patientId: booking.patient_id, bookingId: id }], "Viewed prescription");

  if (new URL(req.url).searchParams.get("format") !== "pdf") {
    return NextResponse.json(prescription);
  }

  const [patient, doctor, hospital] = await Promise.all([
    supabaseAdmin.from("patients").select("name").eq("id", booking.patient_id).maybeSingle(),
    supabaseAdmin.from("doctors").select("name, specialization").eq("id", booking.doctor_id).maybeSingle(),
    supabaseAdmin.from("hospitals").select("name").eq("id", booking.hospital_id).maybeSingle(),
  ]);

  const pdf = generatePrescriptionPdf({
    patientName: patient.data?.name ?? "Patient",
    doctorName: doctor.data?.name ?? "Doctor",
    specialization: doctor.data?.specialization ?? "",
    hospitalName: hospital.data?.name ?? "",
    appointmentDate: booking.appointment_date,
    diagnosis: prescription.diagnosis,
    medicines: prescription.medicines ?? [],
    advice: prescription.advice,
    followUpDate: prescription.follow_up_date,
    issuedOn: String(prescription.updated_at ?? prescription.created_at).slice(0, 10),
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prescription-${booking.appointment_date}.pdf"`,
    },
  });
}

// PUT: the booking's doctor writes or updates the prescription.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "doctor") return unauthorized("Please log in as the doctor.");

  const { id } = await params;
  const booking = await loadBooking(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.doctor_id !== session.id) {
    return forbidden("Only the appointment's doctor can write the prescription.");
  }
  if (bookingFromRow(booking).meta.status === "cancelled") {
    return NextResponse.json({ error: "This appointment was cancelled." }, { status: 409 });
  }

  const cleaned = cleanPrescription((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if (typeof cleaned === "string") {
    return NextResponse.json({ error: cleaned }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("prescriptions")
    .select("id")
    .eq("booking_id", id)
    .maybeSingle();

  const { data, error } = await supabaseAdmin
    .from("prescriptions")
    .upsert(
      {
        booking_id: id,
        doctor_id: booking.doctor_id,
        patient_id: booking.patient_id,
        ...cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "booking_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not save the prescription" }, { status: 500 });
  }

  // First time only: tell the patient it is ready.
  if (!existing) {
    const [{ data: patient }, { data: doctor }] = await Promise.all([
      supabaseAdmin.from("patients").select("name, email").eq("id", booking.patient_id).maybeSingle(),
      supabaseAdmin.from("doctors").select("name").eq("id", booking.doctor_id).maybeSingle(),
    ]);
    if (patient?.email) {
      const { html, text } = emailLayout(
        "Your prescription is ready",
        [
          `Hi ${patient.name},`,
          `${doctor?.name ?? "Your doctor"} has written the prescription for your visit on ${booking.appointment_date}.`,
          "You can view and download it from your dashboard.",
        ],
        { label: "Open my dashboard", url: `${appBaseUrl(req)}/patient-dashboard` }
      );
      await sendEmail({ to: patient.email, subject: "Your prescription is ready", html, text }).catch(() => null);
    }
  }

  return NextResponse.json(data);
}
