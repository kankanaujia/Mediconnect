import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession, unauthorized } from "@/lib/session";

// GET /api/doctor-requests?status=pending|approved|rejected|all
// Doctors see their own requests, hospital staff their hospital's, admins all.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role === "patient") {
    return unauthorized();
  }

  const status = new URL(req.url).searchParams.get("status") ?? "all";

  let query = supabaseAdmin
    .from("doctor_requests")
    .select("*, doctors(name, specialization), hospitals(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (session.role === "doctor") query = query.eq("doctor_id", session.id);
  if (session.role === "hospital") query = query.eq("hospital_id", session.hid ?? "none");
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((row) => {
      const { doctors, hospitals, ...rest } = row as typeof row & {
        doctors: { name: string; specialization: string } | null;
        hospitals: { name: string } | null;
      };
      return {
        ...rest,
        doctor_name: doctors?.name ?? "Doctor",
        specialization: doctors?.specialization ?? "",
        hospital_name: hospitals?.name ?? "",
      };
    })
  );
}
