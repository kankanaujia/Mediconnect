import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { appBaseUrl } from "@/lib/email";
import { doctorStatus, reviewDoctor } from "@/lib/doctorApproval";

const DOCTOR_COLUMNS =
  "id, name, email, specialization, hospital_id, approved, rejected_at, created_at, image_url, phone, qualifications, experience_years, consultation_fee, bio, hospitals(name)";

type DoctorRow = {
  approved: boolean | null;
  rejected_at: string | null;
  hospitals: { name: string } | null;
  [key: string]: unknown;
};

// GET /api/admin/doctors?status=pending|approved|rejected|all
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const status = new URL(req.url).searchParams.get("status") ?? "all";

  const { data, error } = await supabaseAdmin
    .from("doctors")
    .select(DOCTOR_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const doctors = ((data ?? []) as unknown as DoctorRow[])
    .map((row) => ({
      ...row,
      hospital_name: row.hospitals?.name ?? "",
      status: doctorStatus(row),
    }))
    .filter((row) => status === "all" || row.status === status);

  return NextResponse.json(doctors);
}

// PATCH /api/admin/doctors { id, action: "approve" | "reject" }
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id, action } = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "id and action (approve or reject) are required" }, { status: 400 });
  }

  const result = await reviewDoctor(id, action, appBaseUrl(req)).catch((e: Error) => e);
  if (result instanceof Error) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  if (!result) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
