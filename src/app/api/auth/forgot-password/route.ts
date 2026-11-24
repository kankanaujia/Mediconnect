import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { accountTables, parseRole } from "@/lib/accounts";
import { appBaseUrl, emailLayout, sendEmail } from "@/lib/email";
import { clientIp, hitRateLimit, tooManyAttempts } from "@/lib/rateLimit";

const TOKEN_TTL_MINUTES = 30;

// Always answers the same way, so it cannot be used to find out which emails
// have accounts.
const genericResponse = () =>
  NextResponse.json(
    {
      message:
        "If an account exists for that email, a password reset link has been sent. It expires in 30 minutes.",
    },
    { status: 200 }
  );

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { role?: string; email?: string };
  const role = parseRole(body.role);
  const email = (body.email ?? "").trim();

  if (!role || !email) {
    return NextResponse.json({ error: "Role and email are required" }, { status: 400 });
  }

  // Limit reset emails: 5 per IP and 3 per address every 15 minutes.
  const wait = Math.max(
    hitRateLimit(`forgot-ip:${clientIp(req)}`, 5, 15 * 60),
    hitRateLimit(`forgot:${email.toLowerCase()}`, 3, 15 * 60)
  );
  if (wait > 0) {
    return tooManyAttempts(wait);
  }

  const { data: account } = await supabaseAdmin
    .from(accountTables[role])
    .select("id, name, email")
    .eq("email", email)
    .maybeSingle();

  if (!account) {
    return genericResponse();
  }

  // One live link at a time: retire any earlier unused links for this account.
  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("role", role)
    .eq("user_id", account.id)
    .is("used_at", null);

  const token = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin.from("password_reset_tokens").insert({
    role,
    user_id: account.id,
    token_hash: createHash("sha256").update(token).digest("hex"),
    expires_at: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
  });

  if (error) {
    console.error("[forgot-password] could not store token", error.message);
    return NextResponse.json({ error: "Could not start password reset" }, { status: 500 });
  }

  const link = `${appBaseUrl(req)}/reset-password?token=${token}`;
  const { html, text } = emailLayout(
    "Reset your password",
    [
      `Hi ${account.name || "there"},`,
      `We received a request to reset your MediConnect password. The link below works once and expires in ${TOKEN_TTL_MINUTES} minutes.`,
      "If you did not ask for this, you can ignore this email and your password will stay the same.",
    ],
    { label: "Reset password", url: link }
  );
  await sendEmail({ to: account.email, subject: "Reset your MediConnect password", html, text });

  return genericResponse();
}
