import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public fields only: never email, password or approval data.
export const PUBLIC_DOCTOR_COLUMNS =
  "id, name, specialization, image_url, hospital_id, qualifications, experience_years, consultation_fee, bio, hospitals(name, location)";

export type PublicDoctorRow = {
  id: string;
  name: string;
  specialization: string;
  image_url: string | null;
  hospital_id: string;
  qualifications: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  bio: string | null;
  hospitals: { name: string; location: string | null } | null;
};

export type RatingSummary = { average: number | null; count: number };

/** Average rating and review count per doctor. Empty if reviews are not set up yet. */
export async function ratingsFor(doctorIds: string[]) {
  const summary = new Map<string, RatingSummary>();
  if (doctorIds.length === 0) return summary;

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("doctor_id, rating")
    .in("doctor_id", doctorIds);

  if (error) return summary;

  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const t = totals.get(row.doctor_id) ?? { sum: 0, count: 0 };
    t.sum += row.rating;
    t.count += 1;
    totals.set(row.doctor_id, t);
  }
  for (const [id, t] of totals) {
    summary.set(id, { average: Math.round((t.sum / t.count) * 10) / 10, count: t.count });
  }
  return summary;
}

export function shapePublicDoctor(row: PublicDoctorRow, rating?: RatingSummary) {
  return {
    id: row.id,
    name: row.name,
    specialization: row.specialization,
    image_url: row.image_url,
    hospital_id: row.hospital_id,
    hospital_name: row.hospitals?.name ?? "",
    hospital_location: row.hospitals?.location ?? "",
    qualifications: row.qualifications,
    experience_years: row.experience_years,
    consultation_fee: row.consultation_fee,
    bio: row.bio,
    rating: rating?.average ?? null,
    review_count: rating?.count ?? 0,
  };
}
