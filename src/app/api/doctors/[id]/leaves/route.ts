import { NextResponse } from "next/server";
import { upcomingLeaves } from "@/lib/doctorLeave";

// Public: only the dates a doctor is away (no reason), so booking pages can grey them out.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leaves = await upcomingLeaves(id);
  return NextResponse.json(leaves.map(({ start_date, end_date }) => ({ start_date, end_date })));
}
