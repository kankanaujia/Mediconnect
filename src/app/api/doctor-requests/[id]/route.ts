import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { forbidden, getSession, unauthorized } from "@/lib/session";
import { canDecide, decideRequest, type DoctorRequestRow } from "@/lib/doctorRequests";

async function loadRequest(id: string) {
  const { data } = await supabaseAdmin.from("doctor_requests").select("*").eq("id", id).maybeSingle();
  return data as DoctorRequestRow | null;
}

// PATCH { action: "approve" | "reject", note? } - hospital staff or admin.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; note?: string };
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const request = await loadRequest(id);
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (!canDecide(session, request)) {
    return forbidden("Only the doctor's hospital or an admin can decide this request.");
  }

  try {
    const updated = await decideRequest(
      request,
      body.action,
      session,
      (body.note ?? "").toString().trim().slice(0, 500)
    );
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not decide the request" },
      { status: 409 }
    );
  }
}

// DELETE - the doctor withdraws their own pending request.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "doctor") return unauthorized();

  const { id } = await params;
  const request = await loadRequest(id);
  if (!request || request.doctor_id !== session.id) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (request.status !== "pending") {
    return NextResponse.json({ error: `This request is already ${request.status}` }, { status: 409 });
  }

  await supabaseAdmin.from("doctor_requests").delete().eq("id", id).eq("status", "pending");
  return NextResponse.json({ success: true });
}
