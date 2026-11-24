import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession, unauthorized } from "@/lib/session";

const EDITABLE_COLUMNS =
  "id, name, email, specialization, hospital_id, image_url, phone, qualifications, experience_years, consultation_fee, bio";

async function requireDoctor() {
  const session = await getSession();
  return session?.role === "doctor" ? session : null;
}

export async function GET() {
  const session = await requireDoctor();
  if (!session) return unauthorized("Please log in as a doctor.");

  const { data, error } = await supabaseAdmin
    .from("doctors")
    .select(EDITABLE_COLUMNS)
    .eq("id", session.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

function intOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function textOrNull(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

// Doctors can edit their public profile details. Name, email, specialization
// and hospital are set at sign-up and changed by an admin.
export async function PUT(req: Request) {
  const session = await requireDoctor();
  if (!session) return unauthorized("Please log in as a doctor.");

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const imageUrl = textOrNull(body.image_url, 500);
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
    return NextResponse.json({ error: "Photo URL must start with http(s)://" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("doctors")
    .update({
      phone: textOrNull(body.phone, 30),
      qualifications: textOrNull(body.qualifications, 300),
      experience_years: intOrNull(body.experience_years),
      consultation_fee: intOrNull(body.consultation_fee),
      bio: textOrNull(body.bio, 1500),
      image_url: imageUrl,
    })
    .eq("id", session.id)
    .select(EDITABLE_COLUMNS)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save your profile" }, { status: 500 });
  }
  return NextResponse.json(data);
}
