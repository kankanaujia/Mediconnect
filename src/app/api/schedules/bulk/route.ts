import { NextResponse } from "next/server";
import { supabaseAdmin, isUsingServiceRole } from "@/lib/supabaseAdmin";
import { parseScheduleEntry, type ScheduleEntry } from "@/lib/doctorSchedule";

type IncomingSchedule = Partial<ScheduleEntry> & {
  doctor_id: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as { schedules?: IncomingSchedule[] };
  const schedules = Array.isArray(body.schedules) ? body.schedules : [];

  if (schedules.length === 0) {
    return NextResponse.json({ error: "No schedules provided" }, { status: 400 });
  }

  const rows = schedules.map((s) => ({
    doctor_id: s.doctor_id,
    day_of_week: Number(s.dayOfWeek),
    title: s.title ?? "Other",
    start_time: s.startTime ?? "09:00",
    end_time: s.endTime ?? "09:20",
    notes: s.notes ?? "",
  }));

  const { data, error } = await supabaseAdmin
    .from("doctor_schedules")
    .insert(rows)
    .select("id, doctor_id, day_of_week, title, start_time, end_time, notes");

  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.code === "42501" && !isUsingServiceRole()
            ? "Schedule creation is blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to server env."
            : error?.message || "Failed to create schedule entries",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    (data as any[]).map((row) => parseScheduleEntry(row)).filter(Boolean),
    { status: 200 },
  );
}

