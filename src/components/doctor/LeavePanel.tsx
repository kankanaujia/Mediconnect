"use client";

import { useEffect, useState } from "react";
import { CalendarOff } from "lucide-react";

type Leave = { id: string; start_date: string; end_date: string; reason: string | null };

function todayIst() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Doctor asks for leave; the hospital approves it in its Requests tab. */
export default function LeavePanel() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/doctors/me/leave")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setLeaves(Array.isArray(data) ? data : []);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [version]);

  const submit = async () => {
    setSending(true);
    setMessage(null);
    const res = await fetch("/api/doctors/me/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate: endDate || startDate, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setMessage({ ok: false, text: data.error || "Could not send the request" });
      return;
    }
    const affected = Number(data.affectedBookings) || 0;
    setMessage({
      ok: true,
      text: `${data.message}${affected ? ` ${affected} booked appointment(s) fall in this period; the hospital will see that.` : ""}`,
    });
    setStartDate("");
    setEndDate("");
    setReason("");
    setVersion((v) => v + 1);
  };

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900";

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900">
        <CalendarOff className="h-6 w-6 text-amber-600" /> Leave
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Ask your hospital for leave. Once approved, patients cannot book you on those days.
      </p>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm text-gray-700">
          From
          <input type="date" min={todayIst()} className={`${input} mt-1`} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="text-sm text-gray-700">
          To
          <input type="date" min={startDate || todayIst()} className={`${input} mt-1`} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="text-sm text-gray-700 sm:col-span-2">
          Reason (optional)
          <input className={`${input} mt-1`} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={sending || !startDate}
        className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {sending ? "Sending..." : "Request leave"}
      </button>
      {message ? (
        <p className={`mt-2 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
      ) : null}

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700">Approved leave</p>
        {leaves.length === 0 ? (
          <p className="text-sm text-gray-500">None coming up.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm text-gray-700">
            {leaves.map((leave) => (
              <li key={leave.id}>
                {leave.start_date === leave.end_date ? leave.start_date : `${leave.start_date} to ${leave.end_date}`}
                {leave.reason ? ` - ${leave.reason}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
