import { NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/session";
import { createDoctorRequest } from "@/lib/doctorRequests";
import { bookingsInRange, cleanLeave, upcomingLeaves } from "@/lib/doctorLeave";

// GET: the logged-in doctor's approved upcoming leave.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "doctor") return unauthorized("Please log in as a doctor.");
  return NextResponse.json(await upcomingLeaves(session.id));
}

// POST: ask the hospital for leave. It applies only after approval.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "doctor") return unauthorized("Please log in as a doctor.");

  const cleaned = cleanLeave((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if (typeof cleaned === "string") {
    return NextResponse.json({ error: cleaned }, { status: 400 });
  }

  try {
    const affectedBookings = await bookingsInRange(session.id, cleaned.startDate, cleaned.endDate);
    const request = await createDoctorRequest(session.id, "leave", { ...cleaned, affectedBookings });
    return NextResponse.json(
      { message: "Leave request sent to your hospital for approval.", request, affectedBookings },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send the request" },
      { status: 500 }
    );
  }
}
