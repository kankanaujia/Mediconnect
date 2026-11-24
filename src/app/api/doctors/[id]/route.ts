import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PUBLIC_DOCTOR_COLUMNS,
  ratingsFor,
  shapePublicDoctor,
  type PublicDoctorRow,
} from "@/lib/doctorDirectory";

// Public profile of one approved doctor, with recent reviews.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("doctors")
    .select(PUBLIC_DOCTOR_COLUMNS)
    .eq("id", id)
    .eq("approved", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const row = data as unknown as PublicDoctorRow;
  const ratings = await ratingsFor([row.id]);

  const { data: reviewRows } = await supabaseAdmin
    .from("reviews")
    .select("id, rating, comment, created_at, patients(name)")
    .eq("doctor_id", row.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const reviews = ((reviewRows ?? []) as unknown as Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    patients: { name: string } | null;
  }>).map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    // First name only, for privacy.
    patient_name: (review.patients?.name ?? "Patient").split(" ")[0],
  }));

  return NextResponse.json({ ...shapePublicDoctor(row, ratings.get(row.id)), reviews });
}
