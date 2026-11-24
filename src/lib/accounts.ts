import type { SessionRole } from "@/lib/session";

export const accountTables: Record<SessionRole, "patients" | "doctors" | "admins" | "hospital_users"> = {
  patient: "patients",
  doctor: "doctors",
  admin: "admins",
  hospital: "hospital_users",
};

export function parseRole(value: unknown): SessionRole | null {
  return value === "patient" || value === "doctor" || value === "admin" || value === "hospital"
    ? value
    : null;
}

export const MIN_PASSWORD_LENGTH = 8;
