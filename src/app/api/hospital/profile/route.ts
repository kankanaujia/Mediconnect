import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHospital } from "@/lib/hospitalAuth";

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

// PUT: hospital staff update their hospital's contact details.
// The name and registration number are changed by MediConnect only.
export async function PUT(req: Request) {
  const auth = await requireHospital();
  if (auth.response) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const location = text(body.location, 80);
  if (!location) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hospitals")
    .update({
      location,
      address: text(body.address, 300),
      phone_number: text(body.phone_number, 30),
      email: text(body.email, 200),
    })
    .eq("id", auth.session.hid)
    .select("id, name, location, address, phone_number, email, registration_number")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save the hospital details" }, { status: 500 });
  }
  return NextResponse.json(data);
}
