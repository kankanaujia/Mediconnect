import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingFromRow } from "@/lib/bookingMeta";
import { emailLayout, sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

// Messages to doctors: a new confirmed booking, and the morning agenda.
// SMS needs the doctor's phone in their profile (on a Twilio trial account it
// must also be a verified number). Failures are logged and never block.

type BookingRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string | null;
  [key: string]: unknown;
};

/** Sent when a booking's payment is confirmed. */
export async function sendDoctorNewBookingAlert(booking: BookingRow, baseUrl: string) {
  const [{ data: doctor }, { data: patient }] = await Promise.all([
    supabaseAdmin.from("doctors").select("name, email, phone").eq("id", booking.doctor_id).maybeSingle(),
    supabaseAdmin.from("patients").select("name").eq("id", booking.patient_id).maybeSingle(),
  ]);
  if (!doctor) return;

  const parsed = bookingFromRow(booking);
  const when = `${booking.appointment_date} at ${booking.appointment_time.slice(0, 5)}`;
  const kind = parsed.meta.kind === "special" ? "special appointment" : "daily slot";

  const jobs: Promise<unknown>[] = [];
  if (doctor.email) {
    const { html, text } = emailLayout(
      "New appointment booked",
      [
        `Hi ${doctor.name},`,
        `${patient?.name ?? "A patient"} booked a ${kind} with you on ${when}.`,
        parsed.reason ? `Reason: ${parsed.reason}` : "",
      ].filter(Boolean),
      { label: "Open my dashboard", url: `${baseUrl}/doctor-dashboard` }
    );
    jobs.push(sendEmail({ to: doctor.email, subject: `New appointment: ${when}`, html, text }));
  }
  if (doctor.phone) {
    jobs.push(
      sendSms(doctor.phone, `New booking: ${patient?.name ?? "a patient"} on ${when} (${kind}). - MediConnect`).catch(
        () => null
      )
    );
  }
  await Promise.all(jobs);
}

function istToday() {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
}

/**
 * Sends each doctor the list of today's appointments (email, plus SMS when the
 * doctor has a phone number). Returns how many doctors were messaged.
 */
export async function sendDailyAgendas(baseUrl: string) {
  const today = istToday();
  const { data: rows } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("appointment_date", today)
    .eq("status", "booked")
    .order("appointment_time");

  const byDoctor = new Map<string, BookingRow[]>();
  for (const row of (rows ?? []) as BookingRow[]) {
    byDoctor.set(row.doctor_id, [...(byDoctor.get(row.doctor_id) ?? []), row]);
  }
  if (byDoctor.size === 0) return { date: today, doctors: 0, appointments: 0 };

  const doctorIds = [...byDoctor.keys()];
  const patientIds = [...new Set((rows ?? []).map((r) => r.patient_id))];
  const [{ data: doctors }, { data: patients }] = await Promise.all([
    supabaseAdmin.from("doctors").select("id, name, email, phone").in("id", doctorIds),
    supabaseAdmin.from("patients").select("id, name").in("id", patientIds),
  ]);
  const patientName = new Map((patients ?? []).map((p) => [p.id, p.name]));

  let messaged = 0;
  for (const doctor of doctors ?? []) {
    const list = byDoctor.get(doctor.id) ?? [];
    const lines = list.map((b) => `${b.appointment_time.slice(0, 5)} - ${patientName.get(b.patient_id) ?? "Patient"}`);

    const jobs: Promise<unknown>[] = [];
    if (doctor.email) {
      const { html, text } = emailLayout(
        `Your appointments today (${list.length})`,
        [`Good morning ${doctor.name},`, ...lines],
        { label: "Open my dashboard", url: `${baseUrl}/doctor-dashboard` }
      );
      jobs.push(sendEmail({ to: doctor.email, subject: `Today: ${list.length} appointment(s)`, html, text }));
    }
    if (doctor.phone) {
      jobs.push(
        sendSms(
          doctor.phone,
          `Good morning ${doctor.name}. Today: ${list.length} appointment(s). First at ${list[0].appointment_time.slice(0, 5)}. - MediConnect`
        ).catch(() => null)
      );
    }
    await Promise.all(jobs);
    messaged++;
  }

  return { date: today, doctors: messaged, appointments: rows?.length ?? 0 };
}
