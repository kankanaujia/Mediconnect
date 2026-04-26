"use client";

import { useState } from "react";

const hospitals = [
  {
    id: 1,
    name: "City General Hospital",
    status: "Smooth Traffic",
    color: "bg-green-500",
    address: "123 Main Street, Anytown, CA",
    phone: "(555) 123-4567",
    map: "https://www.google.com/maps?q=City+General+Hospital&output=embed",
  },
  {
    id: 2,
    name: "St. Jude's Medical Center",
    status: "Moderate Traffic",
    color: "bg-yellow-500",
    address: "456 Oak Avenue, Metropolis, NY",
    phone: "(555) 987-6543",
    map: "https://www.google.com/maps?q=St+Judes+Medical+Center&output=embed",
  },
  {
    id: 3,
    name: "Community Health Hospital",
    status: "Heavy Traffic",
    color: "bg-red-500",
    address: "789 Pine Lane, Smallville, TX",
    phone: "(555) 234-5678",
    map: "https://www.google.com/maps?q=Community+Health+Hospital&output=embed",
  },
  {
    id: 4,
    name: "Northside Care Center",
    status: "Smooth Traffic",
    color: "bg-green-500",
    address: "321 North St, Chicago, IL",
    phone: "(555) 345-7890",
    map: "https://www.google.com/maps?q=Northside+Care+Center&output=embed",
  },
  {
    id: 5,
    name: "Downtown Medical Hub",
    status: "Moderate Traffic",
    color: "bg-yellow-500",
    address: "654 Center Blvd, LA, CA",
    phone: "(555) 678-1234",
    map: "https://www.google.com/maps?q=Downtown+Medical+Hub&output=embed",
  },
];

export default function HospitalLocationsSection() {
  const [selected, setSelected] = useState(hospitals[0]);

  return (
    <section className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-10">

        {/* HEADER */}
        <div className="text-center mb-8">
          <p className="text-sm tracking-widest font-serif text-[#8fb4c9] mb-">
            FIND US
          </p>
          <h2 className="text-[48px] font-serif font-extrabold text-gray-800">
            Hospital Locations
          </h2>
          <p className="text-gray-500 font-serif mt-2 max-w-2xl mx-auto">
            Visit any of our partner hospitals across the city. Check real-time
            traffic conditions to plan your route.
          </p>
        </div>

        {/* CONTENT */}
        <div className="flex gap-8">

          {/* MAP */}
          <div className="w-2/3 h-[420px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative">

            <iframe
              src={selected.map}
              className="w-full h-full border-0"
              loading="lazy"
            />

            {/* TRAFFIC LEGEND */}
            <div className="absolute bottom-5 left-5 bg-white p-4 rounded-xl shadow-md text-sm">
              <p className="font-serif font-medium mb-2 text-gray-700">
                Traffic Status
              </p>
              <div className="space-y-1 text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 font-serif rounded-full bg-green-500" />
                  Smooth
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 font-serif rounded-full bg-yellow-500" />
                  Moderate
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 font-serif rounded-full bg-red-500" />
                  Heavy
                </div>
              </div>
            </div>

          </div>

          {/* LIST */}
          <div className="w-1/3 max-h-[420px] overflow-y-auto pr-2 space-y-4">

            {hospitals.map((hospital) => (
              <div
                key={hospital.id}
                onClick={() => setSelected(hospital)}
                className={`cursor-pointer border rounded-2xl p-5 transition-all duration-200 ${
                  selected.id === hospital.id
                    ? "border-gray-400 shadow-md"
                    : "border-gray-200 hover:shadow-sm"
                }`}
              >
                {/* TOP */}
                <div className="flex items-center gap-4 mb-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${hospital.color}`}
                  >
                    {hospital.id}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {hospital.name}
                    </h4>
                    <p
                      className={`text-sm ${
                        hospital.color.includes("green")
                          ? "text-green-600"
                          : hospital.color.includes("yellow")
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {hospital.status}
                    </p>
                  </div>
                </div>

                {/* DETAILS */}
                <p className="text-gray-500 text-sm">
                  📍 {hospital.address}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  📞 {hospital.phone}
                </p>

                <p className="mt-2 text-sm text-gray-700 underline">
                  Visit →
                </p>
              </div>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
}