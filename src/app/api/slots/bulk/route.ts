import { requestChange } from "@/lib/requestRoute";

// A batch of slots is one request for the hospital to approve.
export async function POST(req: Request) {
  return requestChange(
    "add_slots",
    (body) => {
      const slots = Array.isArray(body.slots) ? (body.slots as Record<string, unknown>[]) : [];
      if (slots.length === 0) return "No slots provided";
      if (slots.length > 200) return "Too many slots in one request (max 200)";
      return {
        slots: slots.map((s) => ({
          date: s.date,
          duration: Number(s.duration) || 20,
          location: s.location ?? "",
        })),
      };
    },
    req
  );
}
