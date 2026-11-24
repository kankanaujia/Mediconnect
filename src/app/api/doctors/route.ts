import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PUBLIC_DOCTOR_COLUMNS,
  ratingsFor,
  shapePublicDoctor,
  type PublicDoctorRow,
} from "@/lib/doctorDirectory";

// Public directory of approved doctors.
// GET /api/doctors?search=&specialization=&hospital_id=&sort=rating|name|experience
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const search = (params.get("search") ?? "").trim().toLowerCase();
  const specialization = params.get("specialization") ?? "";
  const hospitalId = params.get("hospital_id") ?? "";
  const sort = params.get("sort") ?? "name";

  let query = supabaseAdmin
    .from("doctors")
    .select(PUBLIC_DOCTOR_COLUMNS)
    .eq("approved", true)
    .order("name");

  if (specialization) query = query.eq("specialization", specialization);
  if (hospitalId) query = query.eq("hospital_id", hospitalId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as PublicDoctorRow[];
  const ratings = await ratingsFor(rows.map((r) => r.id));

  let doctors = rows.map((row) => shapePublicDoctor(row, ratings.get(row.id)));

  if (search) {
    doctors = doctors.filter((d) =>
      [d.name, d.specialization, d.hospital_name].some((field) =>
        field.toLowerCase().includes(search)
      )
    );
  }

  if (sort === "rating") {
    doctors.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count);
  } else if (sort === "experience") {
    doctors.sort((a, b) => (b.experience_years ?? -1) - (a.experience_years ?? -1));
  }

  return NextResponse.json(doctors, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
