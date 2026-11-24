"use client";

import { useState } from "react";
import { Video } from "lucide-react";

// Must match lib/videoCall.ts.
const OPENS_MINUTES_BEFORE = 15;
const CLOSES_MINUTES_AFTER = 60;

function startOf(date: string, time: string) {
  return new Date(`${date}T${time.slice(0, 5)}:00+05:30`).getTime();
}

/** "Join video call" for a paid, upcoming appointment; shows when it opens otherwise. */
export default function VideoCallButton({
  bookingId,
  date,
  time,
}: {
  bookingId: string;
  date: string;
  time: string;
}) {
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const start = startOf(date, time);
  const opensAt = start - OPENS_MINUTES_BEFORE * 60 * 1000;
  const closesAt = start + CLOSES_MINUTES_AFTER * 60 * 1000;

  if (now > closesAt) return null;

  const join = async () => {
    setBusy(true);
    const res = await fetch(`/api/bookings/${bookingId}/video`);
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      alert(data.error || "Could not open the call");
      return;
    }
    window.open(data.url, "_blank", "noopener");
  };

  if (now < opensAt) {
    const label = new Date(opensAt).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500">
        <Video className="h-3.5 w-3.5" /> Video call opens {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void join()}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      <Video className="h-3.5 w-3.5" /> {busy ? "Opening..." : "Join video call"}
    </button>
  );
}
