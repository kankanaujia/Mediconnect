type ReminderRecord = {
  sid: string;
  sendAt: string;
  label: string;
};

function normalizeAppointmentTime(time: string) {
  const trimmed = time.trim();

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  return trimmed;
}

function normalizePhone(phone: string) {
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

async function sendTwilioMessage(body: URLSearchParams) {
  const config = getTwilioConfig();

  if (!config) {
    return null;
  }

  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString(
    "base64"
  );

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio request failed: ${text}`);
  }

  return (await response.json()) as { sid: string };
}

export async function sendBookingConfirmationSms(input: {
  phone: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  if (!getTwilioConfig()) {
    return null;
  }

  const body = new URLSearchParams({
    MessagingServiceSid: getTwilioConfig()!.messagingServiceSid,
    To: normalizePhone(input.phone),
    Body: `Hi ${input.patientName}, your appointment with ${input.doctorName} is booked for ${input.appointmentDate} at ${input.appointmentTime}. - MediConnect`,
  });

  return sendTwilioMessage(body);
}

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

  const appointment = new Date(
    `${input.appointmentDate}T${normalizeAppointmentTime(input.appointmentTime)}`
  );
  const candidates = [
    {
      label: "2-day reminder",
      sendAt: new Date(appointment.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      label: "2-hour reminder",
      sendAt: new Date(appointment.getTime() - 2 * 60 * 60 * 1000),
    },
  ];

  const reminders: ReminderRecord[] = [];

  for (const candidate of candidates) {
    const minutesUntilSend =
      (candidate.sendAt.getTime() - Date.now()) / (60 * 1000);

    if (minutesUntilSend < 15 || minutesUntilSend > 35 * 24 * 60) {
      continue;
    }

    const body = new URLSearchParams({
      MessagingServiceSid: getTwilioConfig()!.messagingServiceSid,
      To: normalizePhone(input.phone),
      Body: `Reminder: ${input.patientName}, you have an appointment with ${input.doctorName} on ${input.appointmentDate} at ${input.appointmentTime}. - MediConnect`,
      ScheduleType: "fixed",
      SendAt: candidate.sendAt.toISOString(),
    });

    const result = await sendTwilioMessage(body);

    if (result?.sid) {
      reminders.push({
        sid: result.sid,
        sendAt: candidate.sendAt.toISOString(),
        label: candidate.label,
      });
    }
  }

  return reminders;
}
