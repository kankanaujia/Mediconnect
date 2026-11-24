import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/accounts";

function optionalInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function optionalText(value: unknown, max = 2000) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

// Public doctor sign-up. New accounts wait for an admin to approve them.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const name = optionalText(body.name, 120);
  const email = optionalText(body.email, 200)?.toLowerCase() ?? null;
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const specialization = optionalText(body.specialization, 80);
  const hospitalId = optionalText(body.hospital_id, 64);

  if (!name || !email || !specialization || !hospitalId) {
    return NextResponse.json(
      { error: "Name, email, specialization and hospital are required" },
      { status: 400 }
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  const [{ data: existing }, { data: hospital }] = await Promise.all([
    supabaseAdmin.from("doctors").select("id").ilike("email", email).maybeSingle(),
    supabaseAdmin.from("hospitals").select("id").eq("id", hospitalId).maybeSingle(),
  ]);

  if (existing) {
    return NextResponse.json(
      { error: "A doctor account with this email already exists" },
      { status: 409 }
    );
  }

  if (!hospital) {
    return NextResponse.json({ error: "Please choose a valid hospital" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("doctors").insert({
    name: name.startsWith("Dr") ? name : `Dr. ${name}`,
    email,
    password: hashPassword(password),
    specialization,
    hospital_id: hospitalId,
    approved: false,
    phone: optionalText(body.phone, 30),
    qualifications: optionalText(body.qualifications, 300),
    experience_years: optionalInt(body.experience_years),
    consultation_fee: optionalInt(body.consultation_fee),
    bio: optionalText(body.bio, 1500),
  });

  if (error) {
    return NextResponse.json({ error: "Could not create the account" }, { status: 500 });
  }

  return NextResponse.json(
    {
      message:
        "Thanks! Your account has been created and is waiting for admin approval. We will email you once it is approved.",
    },
    { status: 201 }
  );
}
