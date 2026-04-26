import { NextResponse } from "next/server";
import { supabaseAdmin, isUsingServiceRole } from "@/lib/supabaseAdmin";
import {
  parseScheduleEntry,
  serializeScheduleEntry,
  sortSchedules,
  type ScheduleEntry,
} from "@/lib/doctorSchedule";

type ScheduleRow = {
  id: string;
  doctor_id: string;
  day_of_week: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctor_id = searchParams.get("doctor_id");

  const { data, error } = await supabaseAdmin
    .from("doctor_schedules")
    .select("*")
    .eq("doctor_id", doctor_id)
    .order("day_of_week");

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  const schedules = (data as ScheduleRow[])
    .map((row) => parseScheduleEntry(row))
    .filter((entry) => entry !== null) as ScheduleEntry[];

  return NextResponse.json(sortSchedules(schedules));
}

export async function POST(req: Request) {
  const body = (await req.json()) as ScheduleEntry & { doctor_id: string };

  const { data, error } = await supabaseAdmin
    .from("doctor_schedules")
    .insert([
      {
        doctor_id: body.doctor_id,
        day_of_week: serializeScheduleEntry(body),
      },
    ])
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.code === "42501" && !isUsingServiceRole()
            ? "Schedule creation is blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to server env."
            : error?.message || "Failed to create schedule entry",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(parseScheduleEntry(data as ScheduleRow), { status: 200 });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as ScheduleEntry;

  if (!body.id) {
    return NextResponse.json(
      { error: "Schedule id is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("doctor_schedules")
    .update({
      day_of_week: serializeScheduleEntry(body),
    })
    .eq("id", body.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update schedule entry" },
      { status: 500 }
    );
  }

  return NextResponse.json(parseScheduleEntry(data as ScheduleRow), { status: 200 });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();

  const { error } = await supabaseAdmin.from("doctor_schedules").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete schedule entry" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
