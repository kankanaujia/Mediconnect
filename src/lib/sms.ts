import { appointmentStart } from "@/lib/bookingMeta";

// SMS through Twilio. Without TWILIO_* settings nothing is sent (functions
// return null). A Twilio TRIAL account can only text phone numbers verified in
// the Twilio console, and its messaging service needs a sender number.

type ReminderRecord = {
  sid: string;
  sendAt: string;
  label: string;
};

export function normalizePhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return digits;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return digits;
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    return null;
  }

  return { accountSid, authToken, messagingServiceSid };
}

function authHeader(config: { accountSid: string; authToken: string }) {
  return `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;
}

async function sendTwilioMessage(fields: Record<string, string>) {
  const config = getTwilioConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(config),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        MessagingServiceSid: config.messagingServiceSid,
        ...fields,
      }),
    }
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string; code?: number };
    const message = `Twilio error${data.code ? ` ${data.code}` : ""}: ${data.message ?? response.status}`;
    console.error(`[sms] ${message}`);
    throw new Error(message);
  }

  return (await response.json()) as { sid: string };
}

/** Sends one SMS now. Returns null when Twilio is not configured. */
export async function sendSms(phone: string, body: string) {
  return sendTwilioMessage({ To: normalizePhone(phone), Body: body });
}

/** Schedules reminder SMS 2 days and 2 hours before the appointment (when far enough ahead). */
export async function scheduleBookingReminders(input: {
  phone: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  if (!getTwilioConfig()) {
    return [] as ReminderRecord[];
  }

  const appointment = appointmentStart(input.appointmentDate, input.appointmentTime);
  const candidates = [
    { label: "2-day reminder", sendAt: new Date(appointment.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { label: "2-hour reminder", sendAt: new Date(appointment.getTime() - 2 * 60 * 60 * 1000) },
  ];

  const reminders: ReminderRecord[] = [];

  for (const candidate of candidates) {
    // Twilio only schedules between 15 minutes and 35 days ahead.
    const minutesUntilSend = (candidate.sendAt.getTime() - Date.now()) / (60 * 1000);
    if (minutesUntilSend < 15 || minutesUntilSend > 35 * 24 * 60) {
      continue;
    }

    const result = await sendTwilioMessage({
      To: normalizePhone(input.phone),
      Body: `Reminder: ${input.patientName}, you have an appointment with ${input.doctorName} on ${input.appointmentDate} at ${input.appointmentTime.slice(0, 5)}. - MediConnect`,
      ScheduleType: "fixed",
      SendAt: candidate.sendAt.toISOString(),
    });

    if (result?.sid) {
      reminders.push({ sid: result.sid, sendAt: candidate.sendAt.toISOString(), label: candidate.label });
    }
  }

  return reminders;
}

/** Cancels reminder SMS that were scheduled but not sent yet. Errors are ignored. */
export async function cancelScheduledMessages(sids: string[]) {
  const config = getTwilioConfig();
  if (!config || sids.length === 0) {
    return;
  }

  await Promise.all(
    sids.map((sid) =>
      fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages/${sid}.json`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader(config),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ Status: "canceled" }),
        }
      ).catch(() => null)
    )
  );
}
