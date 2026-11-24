import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingFromRow } from "@/lib/bookingMeta";
import { parsePatientAddress } from "@/lib/patientProfile";

export type BookingRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
};

// The database returns "14:00:00" while clients send "14:00"; compare HH:MM.
export function sameClockTime(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.slice(0, 5) === b.slice(0, 5));
}

export async function enrichBookings(rows: BookingRow[]) {
  const patientIds = [...new Set(rows.map((row) => row.patient_id).filter(Boolean))];
  const doctorIds = [...new Set(rows.map((row) => row.doctor_id).filter(Boolean))];
  const hospitalIds = [...new Set(rows.map((row) => row.hospital_id).filter(Boolean))];

  const [patientsResult, doctorsResult, hospitalsResult] = await Promise.all([
    patientIds.length
      ? supabaseAdmin
          .from("patients")
          .select("id, name, email, phone, address")
          .in("id", patientIds)
      : Promise.resolve({ data: [], error: null }),
    doctorIds.length
      ? supabaseAdmin
          .from("doctors")
          .select("id, name, specialization, hospital_id")
          .in("id", doctorIds)
      : Promise.resolve({ data: [], error: null }),
    hospitalIds.length
      ? supabaseAdmin
          .from("hospitals")
          .select("id, name, location")
          .in("id", hospitalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const patientMap = new Map(
    (patientsResult.data ?? []).map((patient) => [patient.id, patient])
  );
  const doctorMap = new Map(
    (doctorsResult.data ?? []).map((doctor) => [doctor.id, doctor])
  );
  const hospitalMap = new Map(
    (hospitalsResult.data ?? []).map((hospital) => [hospital.id, hospital])
  );

  // Reviews are optional: if the reviews table is missing, bookings still load.
  const reviewMap = new Map<string, { rating: number; comment: string | null }>();
  if (rows.length) {
    const { data: reviewRows } = await supabaseAdmin
      .from("reviews")
      .select("booking_id, rating, comment")
      .in("booking_id", rows.map((row) => row.id));
    for (const review of reviewRows ?? []) {
      reviewMap.set(review.booking_id, { rating: review.rating, comment: review.comment });
    }
  }

  // Prescriptions are optional too (table added in migration 007).
  const prescribed = new Set<string>();
  if (rows.length) {
    const { data: rxRows } = await supabaseAdmin
      .from("prescriptions")
      .select("booking_id")
      .in("booking_id", rows.map((row) => row.id));
    for (const rx of rxRows ?? []) prescribed.add(rx.booking_id);
  }

  return rows.map((row) => {
    const parsed = bookingFromRow(row);
    const doctor = doctorMap.get(row.doctor_id);
    const hospital = hospitalMap.get(row.hospital_id);
    const patient = patientMap.get(row.patient_id);
    const patientProfile = patient ? parsePatientAddress(patient.address) : null;

    return {
      ...row,
      reason: parsed.reason,
      meta: parsed.meta,
      patient_name: patient?.name ?? "Patient",
      patient_phone: patient?.phone ?? "",
      patient_email: patient?.email ?? "",
      patient_location: patientProfile?.location ?? "",
      doctor_name: doctor?.name ?? "Doctor",
      specialization: doctor?.specialization ?? "",
      hospital_name: hospital?.name ?? "",
      hospital_location: hospital?.location ?? "",
      review: reviewMap.get(row.id) ?? null,
      has_prescription: prescribed.has(row.id),
    };
  });
}
