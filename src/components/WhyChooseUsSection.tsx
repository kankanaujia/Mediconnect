"use client";

import { CheckCircle } from "lucide-react";

export default function WhyChooseUsSection() {
  const features = [
    "Single platform for all participating hospitals",
    "Real-time availability across facilities",
    "Comprehensive doctor information",
    "Streamlined booking process",
  ];

  return (
    <section className="w-full bg-[#eaf2f6] py-20">
      <div className="max-w-7xl mx-auto px-10 flex items-center gap-16">
        {/* LEFT CONTENT */}
        <div className="w-1/2">
          {/* Label */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <CheckCircle className="w-5 h-5 text-[#8fb4c9]" />
            </div>
            <p className="text-sm tracking-widest text-[#8fb4c9] font-serif font-medium">
              WHY CHOOSE US
            </p>
          </div>

          {/* Heading */}
          <h2 className="text-[52px] font-serif font-extrabold leading-tight text-gray-800">
            A Centralized System <br /> Designed for You
          </h2>

          {/* Features */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-8 mt-10">
            {features.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#8fb4c9] mt-1" />
                <p className="text-gray-600 text-[15px] font-serif leading-relaxed">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT IMAGE GRID */}
        <div className="w-1/2 grid grid-cols-2 gap-6">
          {/* Top Wide */}
          <div className="col-span-2 h-45 rounded-2xl overflow-hidden shadow-md">
            <img
              src="/why1.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Middle Left */}
          <div className="h-35 rounded-2xl overflow-hidden shadow-md">
            <img
              src="/why2.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Middle Right */}
          <div className="h-35 rounded-2xl overflow-hidden shadow-md">
            <img
              src="/why3.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Bottom Wide */}
          <div className="col-span-2 h-45 rounded-2xl overflow-hidden shadow-md">
            <img
              src="/why4.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
