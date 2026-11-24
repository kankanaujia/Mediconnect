import { parsePatientAddress } from "@/lib/patientProfile";
import { bookingFromRow } from "@/lib/bookingMeta";
import { cancelScheduledMessages, scheduleBookingReminders, sendSms } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type BookingRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string | null;
  [key: string]: unknown;
};

async function loadPeople(booking: BookingRow) {
  const [patientResult, doctorResult] = await Promise.all([
    supabaseAdmin.from("patients").select("name, phone, address").eq("id", booking.patient_id).single(),
    supabaseAdmin.from("doctors").select("name").eq("id", booking.doctor_id).single(),
  ]);

  const patient = patientResult.data as { name: string; phone: string | null; address: string } | null;
  return {
    patient,
    doctorName: doctorResult.data?.name ?? "your doctor",
    patientLocation: patient ? parsePatientAddress(patient.address).location : "",
  };
}

function rupees(paise: number | undefined) {
  return typeof paise === "number" ? `Rs ${Math.round(paise / 100)}` : "the fee";
}

function when(booking: BookingRow) {
  return `${booking.appointment_date} at ${booking.appointment_time.slice(0, 5)}`;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Right after a booking is created: the slot is held, payment still pending. */
export async function sendPaymentPendingSms(booking: BookingRow) {
  const { patient, doctorName } = await loadPeople(booking);
  if (!patient?.phone) return;

  const meta = bookingFromRow(booking).meta;
  try {
    await sendSms(
      patient.phone,
      `Hi ${patient.name}, your appointment with ${doctorName} on ${when(booking)} is reserved. Payment of ${rupees(meta.amount)} is pending - pay from your MediConnect dashboard to confirm. - MediConnect`
    );
  } catch {
    // Logged in sms.ts; a failed SMS never blocks the booking.
  }
}

/** After a verified payment: confirmation SMS plus scheduled reminders. */
export async function sendNotificationsForBooking(booking: BookingRow) {
  const { patient, doctorName, patientLocation } = await loadPeople(booking);

  if (!patient?.phone) {
    return {
      confirmation: null as { sid: string } | null,
      reminders: [] as Array<{ sid: string; sendAt: string; label: string }>,
      error: "Patient phone number is missing.",
      patientLocation,
    };
  }

  const meta = bookingFromRow(booking).meta;

  // Sending again ("Send SMS") must not leave the earlier reminders behind:
  // cancel them first, the new ones replace them.
  await cancelScheduledMessages((meta.notifications?.reminders ?? []).map((r) => r.sid));

  let confirmation: { sid: string } | null = null;
  let reminders: Array<{ sid: string; sendAt: string; label: string }> = [];
  let error: string | null = null;

  try {
    confirmation = await sendSms(
      patient.phone,
      `Hi ${patient.name}, payment of ${rupees(meta.amount)} received. Your appointment with ${doctorName} on ${when(booking)} is confirmed. - MediConnect`
    );
  } catch (e) {
    error = errorText(e, "Failed to send confirmation SMS.");
  }

  try {
    reminders = await scheduleBookingReminders({
      phone: patient.phone,
      patientName: patient.name,
      doctorName,
      appointmentDate: booking.appointment_date,
      appointmentTime: booking.appointment_time,
    });
  } catch (e) {
    const reminderError = errorText(e, "Failed to schedule reminders.");
    error = error ? `${error} ${reminderError}` : reminderError;
  }

  return { confirmation, reminders, error, patientLocation };
}

/**
 * After the date or time changed: move the reminders to the new time (paid
 * bookings only) and tell the patient. Stores the new reminder ids.
 */
export async function handleRescheduledBooking(
  booking: BookingRow,
  previous: { date: string; time: string }
) {
  const meta = bookingFromRow(booking).meta;
  await cancelScheduledMessages((meta.notifications?.reminders ?? []).map((r) => r.sid));

  const { patient, doctorName } = await loadPeople(booking);
  let reminders: Array<{ sid: string; sendAt: string; label: string }> = [];

  if (patient?.phone && meta.paymentStatus === "paid") {
    try {
      reminders = await scheduleBookingReminders({
        phone: patient.phone,
        patientName: patient.name,
        doctorName,
        appointmentDate: booking.appointment_date,
        appointmentTime: booking.appointment_time,
      });
    } catch {
      // Logged in sms.ts.
    }
  }

  await supabaseAdmin
    .from("bookings")
    .update({
      notifications: {
        ...(meta.notifications ?? {}),
        lastAttemptAt: new Date().toISOString(),
        reminders: reminders.map((r) => ({ ...r, status: "scheduled" })),
      },
    })
    .eq("id", booking.id);

  if (patient?.phone) {
    try {
      await sendSms(
        patient.phone,
        `Hi ${patient.name}, your appointment with ${doctorName} has moved from ${previous.date} ${previous.time.slice(0, 5)} to ${when(booking)}. - MediConnect`
      );
    } catch {
      // Logged in sms.ts.
    }
  }
}

/** When a visit is completed, reminders that have not gone out yet are no longer needed. */
export async function cancelBookingReminders(booking: BookingRow) {
  const meta = bookingFromRow(booking).meta;
  await cancelScheduledMessages((meta.notifications?.reminders ?? []).map((r) => r.sid));
}

/** After a cancellation: stop pending reminders and tell the patient (with refund info). */
export async function sendCancellationSms(
  booking: BookingRow,
  options: { refunded: boolean; cancelledBy: "patient" | "doctor" | "admin" }
) {
  const meta = bookingFromRow(booking).meta;
  await cancelScheduledMessages((meta.notifications?.reminders ?? []).map((r) => r.sid));

  const { patient, doctorName } = await loadPeople(booking);
  if (!patient?.phone) return;

  const by = options.cancelledBy === "patient" ? "" : options.cancelledBy === "doctor" ? " by the doctor" : " by MediConnect";
  const refund = options.refunded
    ? ` A full refund of ${rupees(meta.amount)} has been started.`
    : " No payment was taken.";

  try {
    await sendSms(
      patient.phone,
      `Hi ${patient.name}, your appointment with ${doctorName} on ${when(booking)} was cancelled${by}.${refund} - MediConnect`
    );
  } catch {
    // Logged in sms.ts.
  }
}
