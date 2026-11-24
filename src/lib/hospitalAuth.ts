import type { NextResponse } from "next/server";
import { getSession, unauthorized, type Session } from "@/lib/session";

/** Returns the hospital-staff session (with its hospital id), or a 401 response. */
export async function requireHospital(): Promise<
  | { session: Session & { hid: string }; response?: undefined }
  | { session?: undefined; response: NextResponse }
> {
  const session = await getSession();
  if (!session || session.role !== "hospital" || !session.hid) {
    return { response: unauthorized("Please log in as hospital staff.") };
  }
  return { session: session as Session & { hid: string } };
}
