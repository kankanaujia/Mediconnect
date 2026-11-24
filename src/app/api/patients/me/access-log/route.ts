import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession, unauthorized } from "@/lib/session";

// The logged-in patient sees who opened their details, newest first.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "patient") return unauthorized();

  const { data, error } = await supabaseAdmin
    .from("access_logs")
    .select("id, actor_role, actor_name, action, created_at")
    .eq("patient_id", session.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
