import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requestChange } from "@/lib/requestRoute";
import { upcomingLeaves } from "@/lib/doctorLeave";

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

  // Hide free slots on days the doctor is on approved leave.
  let slots = data ?? [];
  if (doctor_id && slots.length) {
    const leaves = await upcomingLeaves(doctor_id);
    if (leaves.length) {
      slots = slots.filter((slot) => {
        const day = String(slot.date).slice(0, 10);
        return slot.is_booked || !leaves.some((l) => day >= l.start_date && day <= l.end_date);
      });
    }
  }

  return NextResponse.json(slots, { status: 200 });
}

// Doctors' changes are requests that their hospital approves (see lib/doctorRequests.ts).

export async function POST(req: Request) {
  return requestChange(
    "add_slot",
    (body) =>
      body.date
        ? { date: body.date, duration: Number(body.duration) || 20, location: body.location ?? "" }
        : "Choose a date and time for the slot",
    req
  );
}

export async function PUT(req: Request) {
  return requestChange(
    "update_slot",
    (body) =>
      body.id && body.date
        ? { id: body.id, date: body.date, duration: Number(body.duration) || 20, location: body.location ?? "" }
        : "Slot id and date are required",
    req
  );
}

export async function DELETE(req: Request) {
  return requestChange(
    "delete_slot",
    (body) => (body.id ? { id: body.id, label: body.label ?? "" } : "Slot id is required"),
    req
  );
}
