"use client";

import Footer from "@/components/Footer";
import { useState } from "react";

export default function DoctorsPage() {
  const specialties = [
    "All Specializations",
    "Cardiology",
    "Pediatrics",
    "Dermatology",
    "Orthopedics",
    "Neurology",
    "Oncology",
    "Gastroenterology",
    "Psychiatry",
  ];

  const [active, setActive] = useState("All Specializations");

  const doctors = [
    {
      name: "Dr. Emily Carter",
      field: "Cardiology",
      hospital: "City General Hospital",
      image: "/doc1.jpg",
    },
    {
      name: "Dr. Michael Chen",
      field: "Orthopedic Surgery",
      hospital: "St. Jude's Medical Center",
      image: "/doc2.jpg",
    },
    {
      name: "Dr. Sarah Rodriguez",
      field: "Pediatrics",
      hospital: "Children's Health Hospital",
      image: "/doc3.jpg",
    },
    {
      name: "Dr. John Miller",
      field: "Neurology",
      hospital: "Neuro Care Clinic",
      image: "/doc4.jpg",
    },
    {
      name: "Dr. Anna Smith",
      field: "Dermatology",
      hospital: "Skin Wellness Center",
      image: "/doc5.jpg",
    },
    {
      name: "Dr. David Lee",
      field: "Oncology",
      hospital: "Cancer Care Institute",
      image: "/doc6.jpg",
    },
    {
      name: "Dr. Olivia Brown",
      field: "Gastroenterology",
      hospital: "Digestive Health Center",
      image: "/doc7.jpg",
    },
    {
      name: "Dr. James Wilson",
      field: "Psychiatry",
      hospital: "MindCare Clinic",
      image: "/doc8.jpg",
    },
    {
      name: "Dr. Sophia Davis",
      field: "Cardiology",
      hospital: "Heart Care Hospital",
      image: "/doc9.jpg",
    },
  ];

  const filteredDoctors =
    active === "All Specializations"
      ? doctors
      : doctors.filter((doc) => doc.field.includes(active));

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="w-full bg-linear-to-r from-[#dfe8ee] via-[#d6e3ea] to-[#cfdde6] py-36 pt-48 text-center">
        <h1 className="text-[64px] font-serif font-extrabold tracking-tight text-gray-800 leading-tight">
          Find Your Medical <span className="text-[#80c8f6] font-serif">Specialist</span>
        </h1>

        <p className="mt-6 font-serif text-gray-500 text-lg max-w-2xl mx-auto">
          Browse our network of experienced healthcare professionals across
          various specializations and book your appointment today.
        </p>
      </section>

      {/* STICKY FILTER BAR */}
      <section className="sticky top-80px z-40 bg-white/80 font-serif backdrop-blur-md border-b border-gray-200">
        <div className="px-10 py-5 max-w-6xl mx-auto flex flex-wrap gap-4">
          {specialties.map((item, index) => (
            <button
              key={index}
              onClick={() => setActive(item)}
              className={`
          px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
          ${
            active === item
              ? "bg-[#0f172a] text-white shadow-md"
              : "border border-gray-300 text-gray-700 hover:bg-gray-100"
          }
        `}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* DOCTORS GRID */}
      <section className="px-10 py-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredDoctors.map((doc, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* IMAGE */}
              <div className="w-full h-220px overflow-hidden">
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-full h-full object-cover hover:scale-105 transition duration-500"
                />
              </div>

              {/* CONTENT */}
              <div className="p-6">
                <h3 className="text-xl font-serif font-semibold text-gray-800">
                  {doc.name}
                </h3>

                <p className="text-[#8fb4c9] font-serif font-medium mt-2">{doc.field}</p>

                <p className="text-gray-500 font-serif text-sm mt-2">{doc.hospital}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
    </div>
  );
}
