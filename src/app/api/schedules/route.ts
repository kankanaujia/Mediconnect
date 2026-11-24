import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requestChange } from "@/lib/requestRoute";
import {
  parseScheduleEntry,
  sortSchedules,
  type ScheduleEntry,
} from "@/lib/doctorSchedule";

type ScheduleRow = {
  id: string;
  doctor_id: string;
  day_of_week: number | string;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctor_id = searchParams.get("doctor_id");

  if (!doctor_id) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await supabaseAdmin
    .from("doctor_schedules")
    .select("id, doctor_id, day_of_week, title, start_time, end_time, notes")
    .eq("doctor_id", doctor_id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  const schedules = (data as ScheduleRow[])
    .map((row) => parseScheduleEntry(row))
    .filter((entry) => entry !== null) as ScheduleEntry[];

  return NextResponse.json(sortSchedules(schedules));
}

// Doctors' changes are requests that their hospital approves (see lib/doctorRequests.ts).

function schedulePayload(body: Record<string, unknown>) {
  return {
    dayOfWeek: Number(body.dayOfWeek),
    title: body.title ?? "Other",
    startTime: body.startTime,
    endTime: body.endTime,
    notes: body.notes ?? "",
  };
}

export async function POST(req: Request) {
  return requestChange(
    "add_schedule",
    (body) =>
      body.startTime && body.endTime ? schedulePayload(body) : "Start and end time are required",
    req
  );
}

export async function PUT(req: Request) {
  return requestChange(
    "update_schedule",
    (body) =>
      body.id && body.startTime && body.endTime
        ? { id: body.id, ...schedulePayload(body) }
        : "Schedule id, start and end time are required",
    req
  );
}

export async function DELETE(req: Request) {
  return requestChange(
    "delete_schedule",
    (body) => (body.id ? { id: body.id, label: body.label ?? "" } : "Schedule id is required"),
    req
  );
}
