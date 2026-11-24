import { NextResponse } from "next/server";
import { supabaseAdmin, isUsingServiceRole } from "@/lib/supabaseAdmin";
import { getSession, unauthorized } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctor_id = searchParams.get("doctor_id");

  let query = supabaseAdmin.from("slots").select("*").order("date");

  if (doctor_id) {
    query = query.eq("doctor_id", doctor_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    return unauthorized("Please log in as a doctor.");
  }

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("slots")
    .insert([
      {
        doctor_id: session.id,
        date: body.date,
        duration: body.duration,
        location: body.location,
      },
    ])
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.code === "42501" && !isUsingServiceRole()
            ? "Slot creation is blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to server env."
            : error?.message || "Failed to create slot",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 200 });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    return unauthorized("Please log in as a doctor.");
  }

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("slots")
    .update({
      date: body.date,
      duration: body.duration,
      location: body.location,
    })
    .eq("id", body.id)
    .eq("doctor_id", session.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update slot" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    return unauthorized("Please log in as a doctor.");
  }

  const { id } = await req.json();

  const { error } = await supabaseAdmin
    .from("slots")
    .delete()
    .eq("id", id)
    .eq("doctor_id", session.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete slot" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
