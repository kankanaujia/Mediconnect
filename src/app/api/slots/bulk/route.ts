import { NextResponse } from "next/server";
import { supabaseAdmin, isUsingServiceRole } from "@/lib/supabaseAdmin";

type IncomingSlot = {
  doctor_id: string;
  date: string;
  duration: number;
  location: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as { slots?: IncomingSlot[] };
  const slots = Array.isArray(body.slots) ? body.slots : [];

  if (slots.length === 0) {
    return NextResponse.json({ error: "No slots provided" }, { status: 400 });
  }

  const rows = slots.map((slot) => ({
    doctor_id: slot.doctor_id,
    date: slot.date,
    duration: slot.duration,
    location: slot.location,
  }));

  const { data, error } = await supabaseAdmin.from("slots").insert(rows).select("*");

  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.code === "42501" && !isUsingServiceRole()
            ? "Slot creation is blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to server env."
            : error?.message || "Failed to create slots",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 200 });
}

