import { parsePatientAddress } from "@/lib/patientProfile";
import { sendBookingConfirmationSms, scheduleBookingReminders } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type BookingRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
};

export async function sendNotificationsForBooking(booking: BookingRow) {
  const [patientResult, doctorResult] = await Promise.all([
    supabaseAdmin.from("patients").select("*").eq("id", booking.patient_id).single(),
    supabaseAdmin.from("doctors").select("name").eq("id", booking.doctor_id).single(),
  ]);

  const patient = patientResult.data as
    | { name: string; phone: string; address: string }
    | null;
  const patientProfile = patient ? parsePatientAddress(patient.address) : null;
  const doctorName = doctorResult.data?.name ?? "Doctor";

  if (!patient?.phone) {
    return {
      confirmation: null as { sid: string } | null,
      reminders: [] as Array<{ sid: string; sendAt: string; label: string }>,
      error: "Patient phone number is missing.",
      patientLocation: patientProfile?.location ?? "",
    };
  }

  let confirmation: { sid: string } | null = null;
  let reminders: Array<{ sid: string; sendAt: string; label: string }> = [];
  let error: string | null = null;

  try {
    confirmation = await sendBookingConfirmationSms({
      phone: patient.phone,
      patientName: patient.name,
      doctorName,
      appointmentDate: booking.appointment_date,
      appointmentTime: booking.appointment_time,
    });
  } catch (notificationError) {
    error =
      notificationError instanceof Error
        ? notificationError.message
        : "Failed to send confirmation SMS.";
  }

  try {
    reminders = await scheduleBookingReminders({
      phone: patient.phone,
      patientName: patient.name,
      doctorName,
      appointmentDate: booking.appointment_date,
      appointmentTime: booking.appointment_time,
    });
  } catch (notificationError) {
    const reminderError =
      notificationError instanceof Error
        ? notificationError.message
        : "Failed to schedule reminders.";
    error = error ? `${error} ${reminderError}` : reminderError;
  }

  return {
    confirmation,
    reminders,
    error,
    patientLocation: patientProfile?.location ?? "",
  };
}
