import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPassword, verifyPassword } from "@/lib/password";
import { shapePatient, type PatientRow } from "@/lib/patientProfile";
import { isDemoLoginEnabled, setSessionCookie } from "@/lib/session";
import { accountTables, parseRole } from "@/lib/accounts";

const DEMO_PASSWORD = "demo123";

const demoAccounts = {
  patient: {
    email: "patient@demo.com",
    user: {
      id: "demo-patient",
      first_name: "Demo",
      last_name: "Patient",
      name: "Demo Patient",
      email: "patient@demo.com",
      phone: "",
      location: "",
      address: "",
      gender: "",
      date_of_birth: "",
    },
  },
  doctor: {
    email: "doctor@demo.com",
    user: {
      id: "demo-id",
      name: "Demo Doctor",
      email: "doctor@demo.com",
      specialization: "General",
    },
  },
} as const;

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

  if (role !== "admin") {
    const demo = demoAccounts[role];
    if (isDemoLoginEnabled() && email === demo.email && password === DEMO_PASSWORD) {
      return setSessionCookie(NextResponse.json(demo.user), role, demo.user.id);
    }
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
