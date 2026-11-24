import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public list of approved hospitals (pending registrations never appear here).
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("hospitals")
    .select("id, name, location, phone_number, rating")
    .eq("approved", true)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "public, max-age=60" } });
}
