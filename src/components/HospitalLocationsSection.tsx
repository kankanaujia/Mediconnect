"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Hospital = {
  id: string;
  name: string;
  location: string;
  phone_number: string;
  rating: number;
};

export default function HospitalLocationsSection() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selected, setSelected] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH FROM SUPABASE
  useEffect(() => {
    const fetchHospitals = async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("*");

      if (error) {
        console.error("Error fetching hospitals:", error);
      } else {
        setHospitals(data || []);
        setSelected(data?.[0] || null);
      }

      setLoading(false);
    };

    fetchHospitals();
  }, []);

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500">
        Loading hospitals...
      </div>
    );
  }

  return (
    <section className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-10">

        {/* HEADER */}
        <div className="text-center mb-8">
          <p className="text-sm tracking-widest font-serif text-[#8fb4c9]">
            FIND US
          </p>
          <h2 className="text-[48px] font-serif font-extrabold text-gray-800">
            Hospital Locations
          </h2>
          <p className="text-gray-500 font-serif mt-2 max-w-2xl mx-auto">
            Visit any of our partner hospitals across the city.
          </p>
        </div>

        {/* CONTENT */}
        <div className="flex gap-8">

          {/* MAP */}
          <div className="w-2/3 h-[420px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative">

            {selected && (
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  selected.name + " " + selected.location
                )}&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
              />
            )}

          </div>

          {/* LIST */}
          <div className="w-1/3 max-h-[420px] overflow-y-auto pr-2 space-y-4">

            {hospitals.map((hospital, index) => (
              <div
                key={hospital.id}
                onClick={() => setSelected(hospital)}
                className={`cursor-pointer border rounded-2xl p-5 transition-all duration-200 ${
                  selected?.id === hospital.id
                    ? "border-gray-400 shadow-md"
                    : "border-gray-200 hover:shadow-sm"
                }`}
              >
                {/* TOP */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm bg-blue-500">
                    {index + 1}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {hospital.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      ⭐ {hospital.rating}
                    </p>
                  </div>
                </div>

                {/* DETAILS */}
                <p className="text-gray-500 text-sm">
                  📍 {hospital.location}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  📞 {hospital.phone_number}
                </p>

                <p className="mt-2 text-sm text-gray-700 underline">
                  Visit →
                </p>
              </div>
            ))}

            {/* EMPTY STATE */}
            {hospitals.length === 0 && (
              <p className="text-gray-500 text-center">
                No hospitals found
              </p>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}