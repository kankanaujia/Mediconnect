export type Medicine = {
  name: string;
  dosage: string;
  frequency: string;
  days: string;
  notes: string;
};

export type Prescription = {
  id?: string;
  booking_id: string;
  diagnosis: string | null;
  medicines: Medicine[];
  advice: string | null;
  follow_up_date: string | null;
  created_at?: string;
  updated_at?: string;
};

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Cleans what the doctor submitted. Returns an error message or the clean values. */
export function cleanPrescription(body: Record<string, unknown>) {
  const medicines = (Array.isArray(body.medicines) ? body.medicines : [])
    .map((m) => {
      const row = (m ?? {}) as Record<string, unknown>;
      return {
        name: text(row.name, 120),
        dosage: text(row.dosage, 60),
        frequency: text(row.frequency, 60),
        days: text(row.days, 30),
        notes: text(row.notes, 200),
      };
    })
    .filter((m) => m.name);

  if (medicines.length > 30) return "Too many medicines (max 30)";

  const diagnosis = text(body.diagnosis, 1000) || null;
  const advice = text(body.advice, 2000) || null;
  const followUp = text(body.follow_up_date, 10);
  if (followUp && !/^\d{4}-\d{2}-\d{2}$/.test(followUp)) return "Follow-up date is not valid";

  if (!diagnosis && !advice && medicines.length === 0) {
    return "Write a diagnosis, advice or at least one medicine";
  }

  return { diagnosis, advice, medicines, follow_up_date: followUp || null };
}
