import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const [hospitals, doctors] = await Promise.all([
    supabaseAdmin
      .from("hospitals")
      .select("id, name, location, phone_number, rating, created_at")
      .order("name"),
    supabaseAdmin.from("doctors").select("hospital_id").eq("approved", true),
  ]);

  if (hospitals.error) {
    return NextResponse.json({ error: hospitals.error.message }, { status: 500 });
  }

  const doctorCounts = new Map<string, number>();
  for (const row of doctors.data ?? []) {
    if (row.hospital_id) {
      doctorCounts.set(row.hospital_id, (doctorCounts.get(row.hospital_id) ?? 0) + 1);
    }
  }

  return NextResponse.json(
    (hospitals.data ?? []).map((hospital) => ({
      ...hospital,
      doctor_count: doctorCounts.get(hospital.id) ?? 0,
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    location?: string;
    phone_number?: string;
  };
  const name = (body.name ?? "").trim();
  const location = (body.location ?? "").trim();

  if (!name || !location) {
    return NextResponse.json({ error: "Hospital name and location are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hospitals")
    .insert({ name, location, phone_number: (body.phone_number ?? "").trim() || null })
    .select("id, name, location, phone_number, rating, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Could not add hospital" }, { status: 500 });
  }

  return NextResponse.json({ ...data, doctor_count: 0 });
}
