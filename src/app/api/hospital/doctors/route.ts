import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHospital } from "@/lib/hospitalAuth";
import { appBaseUrl } from "@/lib/email";
import { doctorStatus, reviewDoctor } from "@/lib/doctorApproval";

// GET: this hospital's doctors (all statuses).
export async function GET() {
  const auth = await requireHospital();
  if (auth.response) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("doctors")
    .select(
      "id, name, email, phone, specialization, qualifications, experience_years, consultation_fee, bio, approved, rejected_at, created_at"
    )
    .eq("hospital_id", auth.session.hid)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json((data ?? []).map((row) => ({ ...row, status: doctorStatus(row) })));
}

// PATCH { id, action: "approve" | "reject" }: only doctors of this hospital.
export async function PATCH(req: Request) {
  const auth = await requireHospital();
  if (auth.response) return auth.response;

  const { id, action } = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "id and action (approve or reject) are required" }, { status: 400 });
  }

  const result = await reviewDoctor(id, action, appBaseUrl(req), auth.session.hid).catch((e: Error) => e);
  if (result instanceof Error) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  if (!result) {
    return NextResponse.json({ error: "Doctor not found at this hospital" }, { status: 404 });
  }
  return NextResponse.json(result);
}
