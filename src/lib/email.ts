// Sends transactional email through Resend (https://resend.com) when
// RESEND_API_KEY and EMAIL_FROM are set. Without them (local development) the
// email is printed to the server log instead, so flows like password reset can
// still be tested.

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(
      `[email] RESEND_API_KEY/EMAIL_FROM not set; not sending.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`
    );
    return { sent: false as const, error: "Email is not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      console.error(`[email] Resend error: ${data.message ?? response.status}`);
      return { sent: false as const, error: data.message ?? `HTTP ${response.status}` };
    }

    return { sent: true as const };
  } catch (error) {
    console.error("[email] send failed", error);
    return { sent: false as const, error: "Email send failed" };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Simple branded layout shared by all MediConnect emails. */
export function emailLayout(title: string, lines: string[], action?: { label: string; url: string }) {
  const body = lines.map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`).join("");
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(action.label)}</a></p>`
    : "";

  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
<h2 style="color:#0e7490;margin-bottom:4px">MediConnect</h2>
<h3 style="margin-top:0">${escapeHtml(title)}</h3>
${body}${button}
<p style="color:#6b7280;font-size:12px;margin-top:32px">This is an automated message from MediConnect.</p>
</div>`;

  const text = [title, "", ...lines, ...(action ? ["", `${action.label}: ${action.url}`] : [])].join("\n");
  return { html, text };
}

/** Base URL for links in emails. */
export function appBaseUrl(req?: Request) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (req) {
    return new URL(req.url).origin;
  }
  return "http://localhost:3000";
}
