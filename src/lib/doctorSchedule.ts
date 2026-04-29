export type ScheduleCategory =
  | "Daily Slot 1"
  | "Daily Slot 2"
  | "Daily Slot 3"
  | "Hospital Round"
  | "Patient Visitation"
  | "Special Appointment"
  | "Other";

export type ScheduleEntry = {
  id?: string;
  doctor_id?: string;
  dayOfWeek: number;
  title: ScheduleCategory;
  startTime: string;
  endTime: string;
  notes: string;
};

const SCHEDULE_PREFIX = "__MEDICONNECT_SCHEDULE__";

export const dayOptions = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function serializeScheduleEntry(entry: ScheduleEntry) {
  return `${SCHEDULE_PREFIX}${JSON.stringify({
    dayOfWeek: entry.dayOfWeek,
    title: entry.title,
    startTime: entry.startTime,
    endTime: entry.endTime,
    notes: entry.notes,
  })}`;
}

export function parseScheduleEntry(row: {
  id?: string;
  doctor_id?: string;
  day_of_week?: string | number | null;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
}) {
  // Preferred normalized row format (Supabase columns)
  if (
    typeof row.day_of_week === "number" &&
    row.start_time &&
    row.end_time &&
    row.title
  ) {
    return {
      id: row.id,
      doctor_id: row.doctor_id,
      dayOfWeek: row.day_of_week,
      title: (row.title as ScheduleCategory) ?? "Other",
      startTime: String(row.start_time).slice(0, 5),
      endTime: String(row.end_time).slice(0, 5),
      notes: row.notes ?? "",
    } satisfies ScheduleEntry;
  }

  const raw = String(row.day_of_week ?? "");

  if (raw.startsWith(SCHEDULE_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(SCHEDULE_PREFIX.length)) as ScheduleEntry;
      return {
        id: row.id,
        doctor_id: row.doctor_id,
        dayOfWeek: parsed.dayOfWeek,
        title: parsed.title,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        notes: parsed.notes ?? "",
      } satisfies ScheduleEntry;
    } catch {
      return null;
    }
  }

  const fallbackDay = Number(raw);

  if (Number.isNaN(fallbackDay)) {
    return null;
  }

  return {
    id: row.id,
    doctor_id: row.doctor_id,
    dayOfWeek: fallbackDay,
    title: "Other",
    startTime: "09:00",
    endTime: "09:20",
    notes: "",
  } satisfies ScheduleEntry;
}

export function sortSchedules(entries: ScheduleEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }

    return a.startTime.localeCompare(b.startTime);
  });
}

export function generateSpecialAppointmentTimes(
  entries: ScheduleEntry[],
  date: string,
  blockedTimes: string[]
) {
  const selectedDate = new Date(`${date}T00:00:00`);
  const dayOfWeek = selectedDate.getDay();
  const blocked = new Set(blockedTimes);

  const scheduleEntries =
    entries.filter(
      (entry) =>
        entry.dayOfWeek === dayOfWeek && entry.title === "Special Appointment"
    ) || [];

  const sourceEntries =
    scheduleEntries.length > 0
      ? scheduleEntries
      : entries.filter((entry) => entry.dayOfWeek === dayOfWeek);

  return sourceEntries.flatMap((entry) => {
    const times: string[] = [];
    const [startHour, startMinute] = entry.startTime.split(":").map(Number);
    const [endHour, endMinute] = entry.endTime.split(":").map(Number);

    let cursor = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    while (cursor + 20 <= end) {
      const hours = String(Math.floor(cursor / 60)).padStart(2, "0");
      const minutes = String(cursor % 60).padStart(2, "0");
      const time = `${hours}:${minutes}`;

      if (!blocked.has(time)) {
        times.push(time);
      }

      cursor += 20;
    }

    return times;
  });
}
