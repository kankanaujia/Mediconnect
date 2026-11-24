import { getSession, unauthorized, type Session } from "@/lib/session";
import type { NextResponse } from "next/server";

/** Returns the admin session, or a 401 response to send back. */
export async function requireAdmin(): Promise<
  { session: Session; response?: undefined } | { session?: undefined; response: NextResponse }
> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { response: unauthorized("Please log in as an admin.") };
  }
  return { session };
}
