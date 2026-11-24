import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const MAX_LEAVE_DAYS = 60;

export type LeaveRow = { id: string; doctor_id: string; start_date: string; end_date: string; reason: string | null };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayIst() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Checks a leave request. Returns an error message or the clean values. */
export function cleanLeave(body: Record<string, unknown>, today = todayIst()) {
  const startDate = typeof body.startDate === "string" ? body.startDate : "";
  const endDate = typeof body.endDate === "string" && body.endDate ? body.endDate : startDate;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";

  if (!DATE.test(startDate) || !DATE.test(endDate)) return "Choose the leave dates";
  if (startDate < today) return "Leave cannot start in the past";
  if (endDate < startDate) return "End date is before the start date";

  const days = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
  if (days > MAX_LEAVE_DAYS) return `Leave can be at most ${MAX_LEAVE_DAYS} days at a time`;

  return { startDate, endDate, reason };
}

/** Upcoming and current leave for a doctor (ends today or later). */
export async function upcomingLeaves(doctorId: string) {
  const { data } = await supabaseAdmin
    .from("doctor_leaves")
    .select("id, doctor_id, start_date, end_date, reason")
    .eq("doctor_id", doctorId)
    .gte("end_date", todayIst())
    .order("start_date");
  return (data ?? []) as LeaveRow[];
}

/** True when the doctor is on approved leave that day. Never blocks if the table is missing. */
export async function isOnLeave(doctorId: string, date: string) {
  const { data, error } = await supabaseAdmin
    .from("doctor_leaves")
    .select("id")
    .eq("doctor_id", doctorId)
    .lte("start_date", date)
    .gte("end_date", date)
    .limit(1);
  return !error && (data?.length ?? 0) > 0;
}

/** Booked (not cancelled) appointments that fall inside the range. */
export async function bookingsInRange(doctorId: string, startDate: string, endDate: string) {
  const { data } = await supabaseAdmin
    .from("bookings")
    .select("id, status")
    .eq("doctor_id", doctorId)
    .gte("appointment_date", startDate)
    .lte("appointment_date", endDate);
  return (data ?? []).filter((row) => row.status !== "cancelled" && row.status !== "completed").length;
}
