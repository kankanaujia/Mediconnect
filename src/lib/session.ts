import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type SessionRole = "patient" | "doctor" | "admin" | "hospital";
export const SESSION_ROLES: SessionRole[] = ["patient", "doctor", "admin", "hospital"];

export type Session = {
  role: SessionRole;
  id: string;
  exp: number;
  /** For hospital staff: the hospital they manage. */
  hid?: string;
};

export const SESSION_COOKIE = "mc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not configured.");
  }

  // Development fallback: derive a secret from the server-only Supabase key so
  // the app still runs before SESSION_SECRET is added to .env.local.
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!fallback) {
    throw new Error("Configure SESSION_SECRET in .env.local.");
  }
  return createHash("sha256").update(`mediconnect-session:${fallback}`).digest("hex");
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(role: SessionRole, id: string, hid?: string) {
  const session: Session = {
    role,
    id,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    ...(hid ? { hid } : {}),
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): Session | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (
      !SESSION_ROLES.includes(session.role) ||
      typeof session.id !== "string" ||
      session.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, role: SessionRole, id: string, hid?: string) {
  res.cookies.set(SESSION_COOKIE, createSessionToken(role, id, hid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export async function getSession() {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export function unauthorized(message = "Please log in again.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "You do not have access to this resource.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** True for the booking's patient, its doctor, its hospital's staff, or an admin. */
export function canAccessBooking(
  session: Session,
  booking: { patient_id: string; doctor_id: string; hospital_id?: string | null }
) {
  return (
    session.role === "admin" ||
    (session.role === "hospital" && !!session.hid && booking.hospital_id === session.hid) ||
    (session.role === "patient" && booking.patient_id === session.id) ||
    (session.role === "doctor" && booking.doctor_id === session.id)
  );
}
