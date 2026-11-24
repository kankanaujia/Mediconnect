import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingFromRow } from "@/lib/bookingMeta";
import { forbidden, getSession, unauthorized } from "@/lib/session";

// POST /api/reviews { booking_id, rating (1-5), comment? }
// A patient can review each of their completed appointments once.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "patient") {
    return unauthorized("Please log in as a patient to leave a review.");
  }

  const body = (await req.json().catch(() => ({}))) as {
    booking_id?: string;
    rating?: number;
    comment?: string;
  };
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : "";

  if (!body.booking_id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "booking_id and a rating from 1 to 5 are required" },
      { status: 400 }
    );
  }

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", body.booking_id)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.patient_id !== session.id) {
    return forbidden();
  }

  if (bookingFromRow(booking).meta.status !== "completed") {
    return NextResponse.json(
      { error: "You can review an appointment once the doctor marks it completed." },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .insert({
      booking_id: booking.id,
      patient_id: session.id,
      doctor_id: booking.doctor_id,
      rating,
      comment: comment || null,
    })
    .select("id, booking_id, rating, comment, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You have already reviewed this appointment." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not save the review" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
