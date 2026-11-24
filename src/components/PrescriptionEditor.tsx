"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, Trash2, X } from "lucide-react";
import type { Medicine } from "@/lib/prescriptions";

const emptyMedicine = (): Medicine => ({ name: "", dosage: "", frequency: "", days: "", notes: "" });

/** Doctor's button + dialog to write or edit a visit's prescription. */
export default function PrescriptionEditor({
  bookingId,
  patientName,
  hasPrescription,
  onSaved,
}: {
  bookingId: string;
  patientName: string;
  hasPrescription: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()]);

  const openEditor = async () => {
    setOpen(true);
    setError("");
    if (!hasPrescription) return;
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}/prescription`);
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setDiagnosis(data.diagnosis ?? "");
    setAdvice(data.advice ?? "");
    setFollowUp(data.follow_up_date ?? "");
    setMedicines(data.medicines?.length ? data.medicines : [emptyMedicine()]);
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    setMedicines((list) => list.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/bookings/${bookingId}/prescription`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, advice, follow_up_date: followUp, medicines }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    setOpen(false);
    onSaved?.();
  };

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900";

  return (
    <>
      <button
        type="button"
        onClick={() => void openEditor()}
        className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
      >
        <FileText className="h-4 w-4" /> {hasPrescription ? "Edit prescription" : "Write prescription"}
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-left shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Prescription for {patientName}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Diagnosis / visit notes
                  <textarea className={`${input} mt-1`} rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                </label>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Medicines</p>
                  <div className="space-y-2">
                    {medicines.map((m, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-2 sm:grid-cols-6">
                        <input className={`${input} col-span-2`} placeholder="Medicine name" value={m.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} />
                        <input className={input} placeholder="Dose (500mg)" value={m.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} />
                        <input className={input} placeholder="1-0-1" value={m.frequency} onChange={(e) => updateMedicine(i, "frequency", e.target.value)} />
                        <input className={input} placeholder="Days" value={m.days} onChange={(e) => updateMedicine(i, "days", e.target.value)} />
                        <button
                          type="button"
                          onClick={() => setMedicines((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [emptyMedicine()]))}
                          className="flex items-center justify-center rounded-lg border border-red-200 text-red-600"
                          aria-label="Remove medicine"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <input className={`${input} col-span-2 sm:col-span-6`} placeholder="Notes (after food, etc.)" value={m.notes} onChange={(e) => updateMedicine(i, "notes", e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMedicines((list) => [...list, emptyMedicine()])}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-700"
                  >
                    <Plus className="h-4 w-4" /> Add medicine
                  </button>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Advice
                  <textarea className={`${input} mt-1`} rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Follow-up date (optional)
                  <input type="date" className={`${input} mt-1`} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
                </label>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save prescription"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
