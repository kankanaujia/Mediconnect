"use client";
/* eslint-disable @next/next/no-img-element -- doctor photos are external URLs entered by doctors, so plain <img> is used */

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Building2, GraduationCap, IndianRupee, Stethoscope } from "lucide-react";
import { RatingSummary, Stars } from "@/components/StarRating";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string;
};

type DoctorProfile = {
  id: string;
  name: string;
  specialization: string;
  image_url: string | null;
  hospital_name: string;
  hospital_location: string;
  qualifications: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  bio: string | null;
  rating: number | null;
  review_count: number;
  reviews: Review[];
};

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/doctors/${id}`).then(async (res) => {
      if (cancelled) return;
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      setDoctor(await res.json());
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-40 text-center text-gray-600">
        <p className="text-xl">This doctor profile is not available.</p>
        <Link href="/Doctors" className="mt-4 inline-block text-blue-500 hover:underline">
          Back to all doctors
        </Link>
      </div>
    );
  }

  if (!doctor) {
    return <div className="px-6 pb-20 pt-40 text-center text-gray-500">Loading profile...</div>;
  }

  const facts = [
    { icon: Stethoscope, label: "Specialty", value: doctor.specialization },
    {
      icon: Building2,
      label: "Hospital",
      value: [doctor.hospital_name, doctor.hospital_location].filter(Boolean).join(", "),
    },
    doctor.qualifications
      ? { icon: GraduationCap, label: "Qualifications", value: doctor.qualifications }
      : null,
    {
      icon: IndianRupee,
      label: "Fees",
      value: `Special appointment ₹${
        doctor.consultation_fee && doctor.consultation_fee > 0 ? doctor.consultation_fee : 700
      } • Daily slot ₹300`,
    },
  ].filter(Boolean) as { icon: typeof Stethoscope; label: string; value: string }[];

  return (
    <div className="bg-white pb-20 pt-32 text-gray-700">
      <div className="mx-auto max-w-5xl px-6">
        <Link href="/Doctors" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> All doctors
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-[320px_1fr]">
          <div className="h-96 overflow-hidden rounded-2xl bg-gray-100">
            {doctor.image_url ? (
              <img src={doctor.image_url} alt={doctor.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-serif text-7xl text-gray-400">
                {doctor.name.replace(/^Dr\.?\s*/, "").charAt(0)}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-serif text-4xl font-bold text-gray-900">{doctor.name}</h1>
            <p className="mt-2 text-lg text-gray-500">
              {doctor.specialization}
              {doctor.experience_years !== null ? ` • ${doctor.experience_years} years experience` : ""}
            </p>
            <div className="mt-3">
              <RatingSummary rating={doctor.rating} count={doctor.review_count} />
            </div>

            {doctor.bio ? <p className="mt-6 leading-relaxed text-gray-600">{doctor.bio}</p> : null}

            <dl className="mt-6 space-y-3">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 text-[#0e7490]" />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/book-appointment?doctor=${doctor.id}`}
                className="rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-black"
              >
                Book an appointment
              </Link>
              <Link
                href="/patient-dashboard"
                className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                See daily slots
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-14">
          <h2 className="font-serif text-2xl font-semibold text-gray-900">Patient reviews</h2>
          {doctor.reviews.length === 0 ? (
            <p className="mt-4 text-gray-500">
              No reviews yet. Patients can review a doctor after a completed appointment.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {doctor.reviews.map((review) => (
                <div key={review.id} className="rounded-xl border p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{review.patient_name}</span>
                    <span className="text-sm text-gray-400">
                      {new Date(review.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Stars value={review.rating} />
                  </div>
                  {review.comment ? <p className="mt-2 text-gray-600">{review.comment}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
