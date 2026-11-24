"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RatingSummary } from "@/components/StarRating";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  image_url: string | null;
  hospital_id: string;
  hospital_name: string;
  experience_years: number | null;
  consultation_fee: number | null;
  rating: number | null;
  review_count: number;
};

type Hospital = { id: string; name: string };

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [hospital, setHospital] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      fetch("/api/doctors").then((r) => r.json()),
      supabase.from("hospitals").select("id, name").order("name"),
    ]).then(([doctorData, hospitalResult]) => {
      if (cancelled) return;
      setDoctors(Array.isArray(doctorData) ? doctorData : []);
      setHospitals((hospitalResult.data as Hospital[]) ?? []);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const specializations = useMemo(
    () => [...new Set(doctors.map((d) => d.specialization))].sort(),
    [doctors]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = doctors.filter(
      (d) =>
        (!hospital || d.hospital_id === hospital) &&
        (!specialization || d.specialization === specialization) &&
        (!term ||
          [d.name, d.specialization, d.hospital_name].some((f) => f.toLowerCase().includes(term)))
    );

    if (sort === "rating") {
      return [...list].sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count
      );
    }
    if (sort === "experience") {
      return [...list].sort((a, b) => (b.experience_years ?? -1) - (a.experience_years ?? -1));
    }
    return list;
  }, [doctors, hospital, specialization, search, sort]);

  const hasFilters = Boolean(search || hospital || specialization);

  return (
    <div className="bg-white">
      <section className="w-full bg-gradient-to-r from-[#dfe8ee] via-[#d6e3ea] to-[#cfdde6] py-36 pt-48 text-center">
        <h1 className="text-[64px] font-serif font-extrabold text-gray-800">
          Find Your Medical <span className="text-[#80c8f6]">Specialist</span>
        </h1>
        <p className="mt-6 text-gray-500 font-serif text-lg max-w-3xl mx-auto leading-relaxed">
          Browse our extensive network of healthcare professionals across various specialties.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="flex items-center gap-2 rounded-lg border px-4 py-3 text-gray-600">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor, specialty or hospital"
              className="w-full outline-none"
            />
          </label>
          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="rounded-lg border px-4 py-3 text-gray-600"
          >
            <option value="">All specialties</option>
            {specializations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            className="rounded-lg border px-4 py-3 text-gray-600"
          >
            <option value="">All hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border px-4 py-3 text-gray-600"
          >
            <option value="name">Sort: Name</option>
            <option value="rating">Sort: Top rated</option>
            <option value="experience">Sort: Most experienced</option>
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {loaded ? `${visible.length} doctor${visible.length === 1 ? "" : "s"} found` : "Loading doctors..."}
          </span>
          {hasFilters ? (
            <button
              onClick={() => {
                setSearch("");
                setHospital("");
                setSpecialization("");
              }}
              className="text-blue-500 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        {loaded && visible.length === 0 ? (
          <p className="rounded-xl border p-8 text-center text-gray-500">
            No doctors match your search. Try a different specialty or hospital.
          </p>
        ) : null}

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((doc) => (
            <Link
              key={doc.id}
              href={`/Doctors/${doc.id}`}
              className="group rounded-xl border p-5 text-gray-600 transition hover:shadow-lg"
            >
              <div className="mb-4 h-72 overflow-hidden rounded-lg bg-gray-100">
                {doc.image_url ? (
                  <img
                    src={doc.image_url}
                    alt={doc.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-5xl text-gray-400">
                    {doc.name.replace(/^Dr\.?\s*/, "").charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-serif text-xl font-semibold text-gray-800">{doc.name}</h3>
              <p className="mt-1 text-gray-500">
                {doc.specialization} • {doc.hospital_name}
              </p>
              <div className="mt-2">
                <RatingSummary rating={doc.rating} count={doc.review_count} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>
                  {doc.experience_years !== null ? `${doc.experience_years} yrs experience` : ""}
                </span>
                <span className="font-medium underline">VIEW PROFILE →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
