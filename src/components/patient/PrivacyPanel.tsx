"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

type AccessEntry = {
  id: string;
  actor_role: "doctor" | "hospital" | "admin";
  actor_name: string | null;
  action: string;
  created_at: string;
};

const roleLabel = { doctor: "Doctor", hospital: "Hospital", admin: "MediConnect" } as const;

/** Patient dashboard section: who viewed my data, download my data, delete my account. */
export default function PrivacyPanel() {
  const router = useRouter();
  const [entries, setEntries] = useState<AccessEntry[] | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/patients/me/access-log")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setEntries(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const deleteAccount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDeleting(true);
    setError("");
    const res = await fetch("/api/patients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setError(data.error || "Could not delete the account");
      return;
    }
    localStorage.removeItem("user");
    alert("Your account has been deleted.");
    router.push("/");
  };

  return (
    <div className="rounded-xl border bg-[#eaf3fb] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
          <ShieldCheck className="h-5 w-5 text-emerald-600" /> Privacy &amp; my data
        </h2>
        <Link href="/privacy" className="text-sm text-blue-600 hover:underline">
          Privacy Policy
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-gray-800">Who viewed my details</p>
        {entries === null ? (
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nobody has opened your details yet.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {entries.slice(0, 10).map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-gray-700">
                  <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {roleLabel[entry.actor_role]}
                  </span>
                  {entry.actor_name ?? "Unknown"} — {entry.action.toLowerCase()}
                </span>
                <span className="text-gray-400">
                  {new Date(entry.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/api/patients/me/export"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Download my data
        </a>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete my account
        </button>
      </div>

      {showDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={deleteAccount} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete your account?</h3>
            <p className="text-sm text-gray-600">
              Your name, email, phone, address and appointment notes are erased and you will be logged out. Hospitals
              keep a record of past visits without anything that identifies you. This cannot be undone.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password to confirm"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800"
              required
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false);
                  setPassword("");
                  setError("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700"
              >
                Keep my account
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
