"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarBooking = {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  meta: { status: "booked" | "completed" | "cancelled"; kind: "daily" | "special" };
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FIRST_HOUR = 7;
const LAST_HOUR = 21;

function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return d;
}

function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const statusStyle: Record<CalendarBooking["meta"]["status"], string> = {
  booked: "border-amber-300 bg-amber-50 text-amber-900",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  cancelled: "border-gray-200 bg-gray-50 text-gray-400 line-through",
};

/** Week grid of a doctor's appointments, Monday to Sunday by hour. */
export default function WeekCalendar({ bookings }: { bookings: CalendarBooking[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showCancelled, setShowCancelled] = useState(false);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const byCell = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const booking of bookings) {
      if (!showCancelled && booking.meta.status === "cancelled") continue;
      const hour = Number(booking.appointment_time.slice(0, 2));
      const key = `${booking.appointment_date}|${hour}`;
      map.set(key, [...(map.get(key) ?? []), booking]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }
    return map;
  }, [bookings, showCancelled]);

  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const todayIso = isoDate(new Date());
  const weekEnd = days[6];
  const label = `${days[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${weekEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

  const shiftWeek = (weeks: number) =>
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + weeks * 7);
      return d;
    });

  const weekCount = days.reduce(
    (sum, day) =>
      sum +
      hours.reduce((s, h) => s + (byCell.get(`${isoDate(day)}|${h}`)?.length ?? 0), 0),
    0
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded-lg border p-2 hover:bg-gray-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded-lg border p-2 hover:bg-gray-50"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
          />
          Show cancelled
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <div className="grid min-w-[760px] grid-cols-[56px_repeat(7,1fr)] text-xs">
          <div className="border-b bg-gray-50" />
          {days.map((day, i) => {
            const iso = isoDate(day);
            return (
              <div
                key={iso}
                className={`border-b border-l px-2 py-2 text-center ${
                  iso === todayIso ? "bg-sky-50 font-semibold text-sky-800" : "bg-gray-50 text-gray-600"
                }`}
              >
                {DAY_NAMES[i]} {day.getDate()}
              </div>
            );
          })}

          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b px-2 py-2 text-right text-gray-400">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((day) => {
                const cell = byCell.get(`${isoDate(day)}|${hour}`) ?? [];
                return (
                  <div key={`${isoDate(day)}-${hour}`} className="min-h-[44px] space-y-1 border-b border-l p-1">
                    {cell.map((booking) => (
                      <div
                        key={booking.id}
                        title={booking.reason || undefined}
                        className={`rounded border px-1.5 py-1 leading-tight ${statusStyle[booking.meta.status]}`}
                      >
                        <span className="font-semibold">{booking.appointment_time.slice(0, 5)}</span>{" "}
                        {booking.patient_name}
                        {booking.meta.kind === "special" ? (
                          <span className="ml-1 rounded bg-white/70 px-1 text-[10px]">special</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {weekCount === 0
          ? "No appointments this week."
          : `${weekCount} appointment${weekCount === 1 ? "" : "s"} this week.`}{" "}
        Appointments outside {FIRST_HOUR}:00-{LAST_HOUR}:00 appear only in the list view.
      </p>
    </div>
  );
}
