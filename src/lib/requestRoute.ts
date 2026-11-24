import { NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/session";
import { createDoctorRequest, type RequestType } from "@/lib/doctorRequests";

/**
 * Shared body of the doctor's slot/schedule write routes: instead of changing
 * data, record a request for the hospital to approve. Responds 202.
 */
export async function requestChange(
  type: RequestType,
  buildPayload: (body: Record<string, unknown>) => Record<string, unknown> | string,
  req: Request
) {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    return unauthorized("Please log in as a doctor.");
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = buildPayload(body);
  if (typeof payload === "string") {
    return NextResponse.json({ error: payload }, { status: 400 });
  }

  try {
    const request = await createDoctorRequest(session.id, type, payload);
    return NextResponse.json(
      {
        message: "Sent to your hospital for approval. It will apply once approved.",
        request,
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send the request" },
      { status: 500 }
    );
  }
}
