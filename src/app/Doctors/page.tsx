"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  hospital_name: string;
  email?: string;
  image_url?: string;
};

type Hospital = {
  id: string;
  name: string;
};

export default function DoctorsPage() {
  const [hospital, setHospital] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const fetchHospitals = async () => {
      const { data } = await supabase.from("hospitals").select("id, name");
      setHospitals(data || []);
    };

    fetchHospitals();
  }, []);

  useEffect(() => {
    if (!hospital) return;

    const fetchDoctors = async () => {
      const { data } = await supabase
        .from("doctors")
        .select("id, name, specialization, image_url, hospitals(name)")
        .eq("hospital_id", hospital);

      const formatted =
        data?.map((d: any) => ({
          id: d.id,
          name: d.name,
          specialization: d.specialization,
          hospital_name: d.hospitals?.name,
          image_url: d.image_url,
        })) || [];

      setDoctors(formatted);
    };

    fetchDoctors();
  }, [hospital]);

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="w-full bg-gradient-to-r from-[#dfe8ee] via-[#d6e3ea] to-[#cfdde6] py-36 pt-48 text-center">
        <h1 className="text-[64px] font-serif font-extrabold text-gray-800">
          Find Your Medical <span className="text-[#80c8f6]">Specialist</span>
        </h1>
        <p className="mt-6 text-gray-500 font-serif text-lg max-w-3xl mx-auto leading-relaxed">
          Browse our extensive network of healthcare professionals across various
          specialties.
        </p>
      </section>

      {/* HOSPITAL FILTER */}
      <section className="px-10 py-10 max-w-4xl mx-auto">
        <select
          value={hospital}
          onChange={(e) => setHospital(e.target.value)}
          className="border p-4 rounded-lg w-full text-gray-600"
        >
          <option value="">Select Hospital</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </section>

      {/* DEFAULT STATIC GRID */}
      {!hospital && (
        <section className="px-10 pb-16">
          <h3 className="text-2xl font-serif mb-8 text-gray-600">
            Our Prestigious Specialists
          </h3>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                name: "Dr. Kanishka Kanaujia",
                spec: "Neurology",
                image: "/images/doctors/doc1.jpeg",
              },
              {
                name: "Dr. Dhruv Gupta",
                spec: "Pediatrics",
                image: "/images/doctors/doc2.jpeg",
              },
              {
                name: "Dr. Elisha",
                spec: "Dermatology",
                image: "/images/doctors/doc3.jpg",
              },
              {
                name: "Dr. Harshita",
                spec: "Orthopedics",
                image: "/images/doctors/doc4.jpg",
              },
              {
                name: "Dr. Namya Jain",
                spec: "Cardiology",
                image: "/images/doctors/doc5.jpg",
              },
              {
                name: "Dr. Chenika",
                spec: "Psychology",
                image: "/images/doctors/doc6.jpg",
              },
            ].map((doc, i) => (
              <div key={i} className="border p-6 rounded-xl">
                
                {/* ✅ IMAGE SUPPORT ADDED */}
                <div className="h-96 bg-gray-200 mb-4 overflow-hidden rounded-lg">
                  {doc.image ? (
                    <img
                      src={doc.image}
                      alt={doc.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      D
                    </div>
                  )}
                </div>

                <h4 className="font-semibold text-gray-600">{doc.name}</h4>
                <p className="text-sm text-gray-500">{doc.spec}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DOCTORS GRID */}
      {hospital && (
        <section className="px-10 pb-16">
          <div className="grid md:grid-cols-3 gap-10">
            {doctors.length === 0 ? (
              <p className="text-gray-600">No doctors available</p>
            ) : (
              doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="border p-6 rounded-xl hover:shadow-lg transition text-gray-600"
                >
                  <div className="h-96 bg-gray-200 mb-4 overflow-hidden rounded-lg">
                    {doc.image_url ? (
                      <img
                        src={doc.image_url}
                        alt={doc.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        D
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-serif font-semibold">
                    {doc.name}
                  </h3>

                  <p className="text-gray-500 mt-2">
                    {doc.specialization}
                  </p>

                  <button
                    onClick={() => setSelectedDoctor(doc)}
                    className="mt-4 text-sm underline"
                  >
                    VIEW PROFILE →
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* MODAL */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-gray-600">
          <div className="bg-white w-[90%] max-w-4xl p-8 rounded-xl relative">
            <button
              onClick={() => setSelectedDoctor(null)}
              className="absolute top-4 right-4 text-xl"
            >
              ✕
            </button>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 overflow-hidden rounded-lg">
                {selectedDoctor.image_url ? (
                  <img
                    src={selectedDoctor.image_url}
                    alt={selectedDoctor.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">
                    D
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-3xl font-serif font-bold">
                  {selectedDoctor.name}
                </h2>

                <p className="text-gray-500 mt-2">
                  {selectedDoctor.specialization}
                </p>

                <p className="mt-4 text-sm text-gray-600">
                  Hospital: {selectedDoctor.hospital_name}
                </p>

                <div className="mt-6 space-y-2">
                  <p>📞 +91-XXXXXXXXXX</p>
                  <p>📧 {selectedDoctor.email || "demo@email.com"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}