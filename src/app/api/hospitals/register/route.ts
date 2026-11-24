import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/accounts";
import { clientIp, hitRateLimit, tooManyAttempts } from "@/lib/rateLimit";

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

// Public hospital sign-up. The hospital stays hidden until a MediConnect admin approves it.
export async function POST(req: Request) {
  const wait = hitRateLimit(`hospital-register:${clientIp(req)}`, 5, 60 * 60);
  if (wait > 0) return tooManyAttempts(wait);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const hospitalName = text(body.hospital_name, 150);
  const city = text(body.location, 80);
  const address = text(body.address, 300);
  const phone = text(body.phone_number, 30);
  const registrationNumber = text(body.registration_number, 60);
  const contactName = text(body.contact_name, 120);
  const email = text(body.email, 200)?.toLowerCase() ?? null;
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (!hospitalName || !city || !contactName || !email || !phone) {
    return NextResponse.json(
      { error: "Hospital name, city, phone, contact name and email are required" },
      { status: 400 }
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("hospital_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const { data: hospital, error: hospitalError } = await supabaseAdmin
    .from("hospitals")
    .insert({
      name: hospitalName,
      location: city,
      address,
      phone_number: phone,
      email,
      registration_number: registrationNumber,
      approved: false,
    })
    .select("id")
    .single();

  if (hospitalError || !hospital) {
    return NextResponse.json({ error: "Could not register the hospital" }, { status: 500 });
  }

  const { error: userError } = await supabaseAdmin.from("hospital_users").insert({
    hospital_id: hospital.id,
    name: contactName,
    email,
    password: hashPassword(password),
  });

  if (userError) {
    await supabaseAdmin.from("hospitals").delete().eq("id", hospital.id);
    return NextResponse.json({ error: "Could not create the account" }, { status: 500 });
  }

  return NextResponse.json(
    {
      message:
        "Thank you! Your hospital has been registered and is waiting for MediConnect approval. We will email you once it is approved.",
    },
    { status: 201 }
  );
}
