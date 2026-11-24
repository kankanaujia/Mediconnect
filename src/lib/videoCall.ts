import { createHash, createHmac } from "crypto";
import { appointmentStart } from "@/lib/bookingMeta";

// Online consultation through Jitsi Meet (free, no accounts). Each booking gets
// its own room whose name is derived from a server secret, so it cannot be
// guessed; only the booking's patient and doctor are given the link.

export const CALL_OPENS_MINUTES_BEFORE = 15;
export const CALL_CLOSES_MINUTES_AFTER = 60;

function secret() {
  return (
    process.env.SESSION_SECRET ||
    createHash("sha256").update(`video:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex")
  );
}

export function videoRoomUrl(bookingId: string) {
  const token = createHmac("sha256", secret()).update(`video-room:${bookingId}`).digest("hex").slice(0, 24);
  return `https://meet.jit.si/MediConnect-${token}`;
}

export function callWindow(appointmentDate: string, appointmentTime: string) {
  const start = appointmentStart(appointmentDate, appointmentTime).getTime();
  const opensAt = new Date(start - CALL_OPENS_MINUTES_BEFORE * 60 * 1000);
  const closesAt = new Date(start + CALL_CLOSES_MINUTES_AFTER * 60 * 1000);
  const now = Date.now();
  return { opensAt, closesAt, open: now >= opensAt.getTime() && now <= closesAt.getTime() };
}
