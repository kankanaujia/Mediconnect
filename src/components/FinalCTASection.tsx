"use client";

import Link from "next/link";

export default function FinalCTASection() {
  return (
    <section className="w-full bg-white py-40 text-center">
      <div className="max-w-3xl mx-auto px-6">

        {/* HEADING */}
        <h2 className="text-[62px] font-serif font-extrabold text-gray-800 leading-tight">
          Ready to Prioritize
          <br />
          Your Health?
        </h2>

        {/* SUBTEXT */}
        <p className="mt-6 text-gray-500 font-serif text-lg">
          Explore our network of medical professionals and find the right
          specialist for your healthcare needs today.
        </p>

        {/* BUTTONS */}
        <div className="mt-10 flex justify-center gap-6">

          {/* PRIMARY */}
          <Link href="/doctors">
            <button className="px-8 py-4 bg-gray-800 text-white font-serif rounded-md font-medium hover:bg-gray-900 transition">
              Browse Doctors
            </button>
          </Link>

          {/* SECONDARY */}
          <Link href="/hospitals">
            <button className="px-8 py-4 border border-gray-400 text-gray-700 font-serif rounded-md font-medium hover:bg-gray-100 transition">
              View Hospitals
            </button>
          </Link>

        </div>
      </div>
    </section>
  );
}