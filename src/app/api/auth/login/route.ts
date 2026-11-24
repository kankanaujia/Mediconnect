import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPassword, verifyPassword } from "@/lib/password";
import { shapePatient, type PatientRow } from "@/lib/patientProfile";
import { setSessionCookie } from "@/lib/session";
import { clearRateLimit, clientIp, hitRateLimit, tooManyAttempts } from "@/lib/rateLimit";
import { accountTables, parseRole } from "@/lib/accounts";

const invalid = () =>
  NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    role?: string;
    email?: string;
    password?: string;
  };

  const role = parseRole(body.role);
  const email = (body.email ?? "").trim();
  const password = (body.password ?? "").trim();

  if (!role || !email || !password) {
    return NextResponse.json(
      { error: "Role, email and password are required" },
      { status: 400 }
    );
  }

  // Slow down password guessing: per account and per IP, 15 minute windows.
  const accountKey = `login:${role}:${email.toLowerCase()}`;
  const wait = Math.max(
    hitRateLimit(accountKey, 8, 15 * 60),
    hitRateLimit(`login-ip:${clientIp(req)}`, 30, 15 * 60)
  );
  if (wait > 0) {
    return tooManyAttempts(wait);
  }

  const table = accountTables[role];
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) {
    return invalid();
  }

  const check = verifyPassword(password, data.password);
  if (!check.ok) {
    return invalid();
  }

  // Only say why a doctor cannot log in once they have proven the password.
  if (role === "doctor" && data.approved !== true) {
    return NextResponse.json(
      {
        error: data.rejected_at
          ? "Your doctor account was not approved. Please contact the hospital administrator."
          : "Your doctor account is waiting for admin approval. You can log in once it is approved.",
      },
      { status: 403 }
    );
  }

  clearRateLimit(accountKey);

  if (check.needsRehash) {
    await supabaseAdmin
      .from(table)
      .update({ password: hashPassword(password) })
      .eq("id", data.id);
  }

  const account: Record<string, unknown> = { ...data };
  delete account.password;
  const user = role === "patient" ? shapePatient(data as PatientRow) : account;

  return setSessionCookie(NextResponse.json(user, { status: 200 }), role, data.id);
}
