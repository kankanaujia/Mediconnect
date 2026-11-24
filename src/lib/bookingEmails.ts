import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingFromRow } from "@/lib/bookingMeta";
import { emailLayout, sendEmail } from "@/lib/email";

type BookingRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
};

async function loadParties(booking: BookingRow) {
  const [patient, doctor, hospital] = await Promise.all([
    supabaseAdmin.from("patients").select("name, email").eq("id", booking.patient_id).maybeSingle(),
    supabaseAdmin
      .from("doctors")
      .select("name, email, specialization")
      .eq("id", booking.doctor_id)
      .maybeSingle(),
    supabaseAdmin
      .from("hospitals")
      .select("name, location")
      .eq("id", booking.hospital_id)
      .maybeSingle(),
  ]);

  return {
    patient: patient.data,
    doctor: doctor.data,
    hospital: hospital.data,
  };
}

function formatAmount(paise: number | undefined, currency = "INR") {
  if (typeof paise !== "number") return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(paise / 100);
}

function whenText(booking: BookingRow) {
  return `${booking.appointment_date} at ${booking.appointment_time.slice(0, 5)}`;
}

function placeText(hospital: { name: string; location: string | null } | null) {
  if (!hospital) return "";
  return hospital.location ? `${hospital.name}, ${hospital.location}` : hospital.name;
}

/** Sent to the patient once payment is verified. */
export async function sendBookingConfirmedEmail(booking: BookingRow, baseUrl: string) {
  const { patient, doctor, hospital } = await loadParties(booking);
  if (!patient?.email) return;

  const meta = bookingFromRow(booking).meta;
  const { html, text } = emailLayout(
    "Your appointment is confirmed",
    [
      `Hi ${patient.name || "there"},`,
      `Your appointment with ${doctor?.name ?? "your doctor"}${
        doctor?.specialization ? ` (${doctor.specialization})` : ""
      } is confirmed.`,
      `When: ${whenText(booking)}`,
      hospital ? `Where: ${placeText(hospital)}` : "",
      meta.amount ? `Paid: ${formatAmount(meta.amount, meta.currency)}` : "",
      "You can download your receipt or cancel up to 2 hours before the appointment from your dashboard.",
    ].filter(Boolean),
    { label: "Open my dashboard", url: `${baseUrl}/patient-dashboard` }
  );

  await sendEmail({
    to: patient.email,
    subject: `Appointment confirmed: ${whenText(booking)}`,
    html,
    text,
  });
}

/** Sent to the patient and the doctor when a booking is cancelled. */
export async function sendBookingCancelledEmails(
  booking: BookingRow,
  options: { cancelledBy: "patient" | "doctor" | "admin"; refunded: boolean },
  baseUrl: string
) {
  const { patient, doctor, hospital } = await loadParties(booking);
  const meta = bookingFromRow(booking).meta;
  const by =
    options.cancelledBy === "patient"
      ? "the patient"
      : options.cancelledBy === "doctor"
        ? "the doctor"
        : "the MediConnect team";

  const jobs: Promise<unknown>[] = [];

  if (patient?.email) {
    const { html, text } = emailLayout(
      "Your appointment was cancelled",
      [
        `Hi ${patient.name || "there"},`,
        `Your appointment with ${doctor?.name ?? "your doctor"} on ${whenText(booking)}${
          hospital ? ` at ${placeText(hospital)}` : ""
        } was cancelled by ${by}.`,
        options.refunded
          ? `A full refund of ${formatAmount(meta.amount, meta.currency)} has been started. It usually reaches your account in 5-7 working days.`
          : "No payment was taken for this appointment.",
        "You can book a new appointment any time from your dashboard.",
      ],
      { label: "Book again", url: `${baseUrl}/patient-dashboard` }
    );
    jobs.push(
      sendEmail({ to: patient.email, subject: "Appointment cancelled", html, text })
    );
  }

  if (doctor?.email && options.cancelledBy !== "doctor") {
    const { html, text } = emailLayout(
      "An appointment was cancelled",
      [
        `Hi ${doctor.name || "Doctor"},`,
        `The appointment with ${patient?.name ?? "a patient"} on ${whenText(booking)} was cancelled by ${by}. The time is free again.`,
      ],
      { label: "Open my dashboard", url: `${baseUrl}/doctor-dashboard` }
    );
    jobs.push(
      sendEmail({ to: doctor.email, subject: "Appointment cancelled", html, text })
    );
  }

  await Promise.all(jobs);
}
