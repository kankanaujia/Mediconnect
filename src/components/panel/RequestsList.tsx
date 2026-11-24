"use client";

import { useState } from "react";

export type DoctorRequest = {
  id: string;
  doctor_name: string;
  specialization: string;
  hospital_name: string;
  summary: string | null;
  status: "pending" | "approved" | "rejected";
  response_note: string | null;
  created_at: string;
  decided_at: string | null;
};

const statusStyle: Record<DoctorRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-gray-200 text-gray-600",
};

function when(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
}

/**
 * Doctor change requests. mode "decide" (hospital/admin) shows approve/reject,
 * mode "doctor" shows the doctor's own requests with a withdraw button.
 */
export default function RequestsList({
  requests,
  mode,
  showHospital = false,
  onDecide,
  onWithdraw,
}: {
  requests: DoctorRequest[];
  mode: "decide" | "doctor";
  showHospital?: boolean;
  onDecide?: (id: string, action: "approve" | "reject", note: string) => Promise<void>;
  onWithdraw?: (id: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <p className="rounded-xl border bg-white p-6 text-sm text-gray-500">
        {mode === "decide" ? "No requests from doctors yet." : "You have not sent any requests yet."}
      </p>
    );
  }

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    await fn();
    setBusy(null);
  };

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {mode === "decide" ? (
                <p className="font-semibold text-gray-900">
                  {r.doctor_name}
                  <span className="font-normal text-gray-500">
                    {" "}
                    • {r.specialization}
                    {showHospital && r.hospital_name ? ` • ${r.hospital_name}` : ""}
                  </span>
                </p>
              ) : null}
              <p className="mt-1 text-sm text-gray-700">{r.summary}</p>
              <p className="mt-1 text-xs text-gray-400">
                Sent {when(r.created_at)}
                {r.decided_at ? ` • decided ${when(r.decided_at)}` : ""}
              </p>
              {r.response_note ? (
                <p className="mt-1 text-xs text-gray-600">Note: {r.response_note}</p>
              ) : null}
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle[r.status]}`}>
              {r.status}
            </span>
          </div>

          {r.status === "pending" && mode === "decide" && onDecide ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={notes[r.id] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                placeholder="Optional note to the doctor"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
              />
              <div className="flex gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => void run(r.id, () => onDecide(r.id, "approve", notes[r.id] ?? ""))}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => void run(r.id, () => onDecide(r.id, "reject", notes[r.id] ?? ""))}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : null}

          {r.status === "pending" && mode === "doctor" && onWithdraw ? (
            <button
              disabled={busy === r.id}
              onClick={() => void run(r.id, () => onWithdraw(r.id))}
              className="mt-3 text-sm text-red-600 hover:underline disabled:opacity-60"
            >
              Withdraw request
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
