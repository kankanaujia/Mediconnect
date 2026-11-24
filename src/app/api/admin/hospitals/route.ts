import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { appBaseUrl, emailLayout, sendEmail } from "@/lib/email";

const COLUMNS =
  "id, name, location, address, phone_number, email, registration_number, rating, approved, rejected_at, created_at";

function hospitalStatus(row: { approved: boolean | null; rejected_at: string | null }) {
  if (row.approved === true) return "approved";
  return row.rejected_at ? "rejected" : "pending";
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const [hospitals, doctors, staff] = await Promise.all([
    supabaseAdmin.from("hospitals").select(COLUMNS).order("name"),
    supabaseAdmin.from("doctors").select("hospital_id").eq("approved", true),
    supabaseAdmin.from("hospital_users").select("hospital_id, name, email"),
  ]);

  if (hospitals.error) {
    return NextResponse.json({ error: hospitals.error.message }, { status: 500 });
  }

  const doctorCounts = new Map<string, number>();
  for (const row of doctors.data ?? []) {
    if (row.hospital_id) doctorCounts.set(row.hospital_id, (doctorCounts.get(row.hospital_id) ?? 0) + 1);
  }

  return NextResponse.json(
    (hospitals.data ?? []).map((hospital) => ({
      ...hospital,
      status: hospitalStatus(hospital),
      doctor_count: doctorCounts.get(hospital.id) ?? 0,
      staff: (staff.data ?? []).filter((s) => s.hospital_id === hospital.id).map((s) => ({ name: s.name, email: s.email })),
    }))
  );
}

// Admin adds a hospital directly (approved straight away).
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
    .insert({ name, location, phone_number: (body.phone_number ?? "").trim() || null, approved: true })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Could not add hospital" }, { status: 500 });
  }

  return NextResponse.json({ ...data, status: "approved", doctor_count: 0, staff: [] });
}

// PATCH { id, action: "approve" | "reject" } for hospital registrations.
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id, action } = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "id and action (approve or reject) are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hospitals")
    .update(action === "approve" ? { approved: true, rejected_at: null } : { approved: false, rejected_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Hospital not found" }, { status: error ? 500 : 404 });
  }

  const { data: staff } = await supabaseAdmin.from("hospital_users").select("name, email").eq("hospital_id", id);
  const approved = action === "approve";
  await Promise.all(
    (staff ?? []).map((member) => {
      const { html, text } = emailLayout(
        approved ? "Your hospital is approved" : "Your hospital registration",
        approved
          ? [`Hi ${member.name},`, `${data.name} is now live on MediConnect. Log in to manage your doctors and appointments.`]
          : [`Hi ${member.name},`, `The registration for ${data.name} was not approved. Please contact MediConnect for details.`],
        approved ? { label: "Log in", url: `${appBaseUrl(req)}/hospital/login` } : undefined
      );
      return sendEmail({
        to: member.email,
        subject: approved ? "MediConnect: hospital approved" : "MediConnect: registration update",
        html,
        text,
      });
    })
  );

  return NextResponse.json({ ...data, status: hospitalStatus(data) });
}
