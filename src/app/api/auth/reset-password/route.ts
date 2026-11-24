import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MIN_PASSWORD_LENGTH, accountTables, parseRole } from "@/lib/accounts";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; password?: string };
  const token = (body.token ?? "").trim();
  const password = (body.password ?? "").trim();

  if (!token) {
    return NextResponse.json({ error: "The reset link is missing its token." }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const { data: record } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("id, role, user_id, expires_at, used_at")
    .eq("token_hash", createHash("sha256").update(token).digest("hex"))
    .maybeSingle();

  const role = parseRole(record?.role);
  if (!record || !role || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Mark the link used first (only if still unused) so it cannot be replayed.
  const { data: claimed } = await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id)
    .is("used_at", null)
    .select("id");

  if (!claimed || claimed.length === 0) {
    return NextResponse.json(
      { error: "This reset link has already been used." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from(accountTables[role])
    .update({ password: hashPassword(password) })
    .eq("id", record.user_id);

  if (error) {
    return NextResponse.json({ error: "Could not update the password" }, { status: 500 });
  }

  return NextResponse.json({ success: true, role }, { status: 200 });
}
