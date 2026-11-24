import type { SessionRole } from "@/lib/session";

export const accountTables: Record<SessionRole, "patients" | "doctors" | "admins"> = {
  patient: "patients",
  doctor: "doctors",
  admin: "admins",
};

export function parseRole(value: unknown): SessionRole | null {
  return value === "patient" || value === "doctor" || value === "admin" ? value : null;
}

export const MIN_PASSWORD_LENGTH = 8;
