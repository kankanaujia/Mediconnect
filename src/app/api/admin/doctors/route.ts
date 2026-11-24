import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { appBaseUrl, emailLayout, sendEmail } from "@/lib/email";

const DOCTOR_COLUMNS =
  "id, name, email, specialization, hospital_id, approved, rejected_at, created_at, image_url, phone, qualifications, experience_years, consultation_fee, bio, hospitals(name)";

type DoctorRow = {
  approved: boolean | null;
  rejected_at: string | null;
  hospitals: { name: string } | null;
  [key: string]: unknown;
};

function doctorStatus(row: DoctorRow) {
  if (row.approved === true) return "approved";
  return row.rejected_at ? "rejected" : "pending";
}

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

  const { id, action } = (await req.json().catch(() => ({}))) as {
    id?: string;
    action?: string;
  };

  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json(
      { error: "id and action (approve or reject) are required" },
      { status: 400 }
    );
  }

  const update =
    action === "approve"
      ? { approved: true, rejected_at: null }
      : { approved: false, rejected_at: new Date().toISOString() };

  const { data, error } = await supabaseAdmin
    .from("doctors")
    .update(update)
    .eq("id", id)
    .select("id, name, email, approved, rejected_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Doctor not found" },
      { status: error ? 500 : 404 }
    );
  }

  if (data.email) {
    const approved = action === "approve";
    const { html, text } = emailLayout(
      approved ? "Your doctor account is approved" : "Your doctor application",
      approved
        ? [
            `Hi ${data.name},`,
            "Your MediConnect doctor account has been approved. You can now log in, set your weekly schedule and open appointment slots.",
          ]
        : [
            `Hi ${data.name},`,
            "Thank you for applying to MediConnect. Unfortunately your doctor account was not approved. Please contact the hospital administrator if you think this is a mistake.",
          ],
      approved ? { label: "Log in", url: `${appBaseUrl(req)}/Doctor_login` } : undefined
    );
    await sendEmail({
      to: data.email,
      subject: approved ? "MediConnect: account approved" : "MediConnect: application update",
      html,
      text,
    });
  }

  return NextResponse.json({
    ...data,
    status: action === "approve" ? "approved" : "rejected",
  });
}
