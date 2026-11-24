import { requestChange } from "@/lib/requestRoute";

// A batch of schedule entries is one request for the hospital to approve.
export async function POST(req: Request) {
  return requestChange(
    "add_schedules",
    (body) => {
      const schedules = Array.isArray(body.schedules) ? (body.schedules as Record<string, unknown>[]) : [];
      if (schedules.length === 0) return "No schedules provided";
      if (schedules.length > 100) return "Too many entries in one request (max 100)";
      return {
        schedules: schedules.map((s) => ({
          dayOfWeek: Number(s.dayOfWeek),
          title: s.title ?? "Other",
          startTime: s.startTime ?? "09:00",
          endTime: s.endTime ?? "09:20",
          notes: s.notes ?? "",
        })),
      };
    },
    req
  );
}
