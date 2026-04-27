"use client";

import { useRouter } from "next/navigation";

const steps = [
  {
    number: "01",
    title: "Select Hospital",
    desc: "Choose your preferred healthcare facility from our network",
    image: "images/process1.jpg",
  },
  {
    number: "02",
    title: "Select Specialization",
    desc: "Choose the medical field relevant to your health needs",
    image: "images/process2.jpg",
  },
  {
    number: "03",
    title: "Review Doctor Profiles",
    desc: "Explore credentials, experience, and hospital affiliations",
    image: "images/process3.jpg",
  },
  {
    number: "04",
    title: "Book Your Slot",
    desc: "Pick an available time that fits your schedule",
    image: "images/process4.webp",
  },
];

export default function ProcessSection() {
  const router = useRouter(); // ✅ CORRECT PLACE

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-10 pb-12 flex gap-10">
        {/* LEFT SIDE */}
        <div className="w-1/2 relative mt-16 pb-40">
          <div className="sticky top-[150px]">
            <p className="text-sm tracking-widest font-serif text-[#8fb4c9] mb-4">
              THE PROCESS
            </p>

            <h2 className="text-[56px] font-serif font-extrabold leading-tight text-gray-800">
              Your Path to
              <br />
              Better Healthcare
            </h2>

            <p className="mt-6 font-serif text-gray-500 max-w-md">
              We've streamlined the appointment process to save you time and
              provide clarity at every step. No more waiting on hold.
            </p>

            <button
              onClick={() => router.push("/Hospitals")}
              className="mt-8 border-b font-serif border-gray-800 pb-1 text-sm flex items-center gap-2 text-gray-600 hover:text-black transition cursor-pointer"
            >
              View Participating Hospitals →
            </button>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-2/3 flex flex-col -mt-20 space-y-[-200px]">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-6 min-h-[70vh]">
              {/* NUMBER */}
              <div className="w-10 h-10 rounded-full border font-serif border-gray-300 flex items-center justify-center text-sm text-gray-400">
                {step.number}
              </div>

              {/* CONTENT */}
              <div className="flex items-center justify-between w-full gap-6">
                <div className="max-w-sm">
                  <h3 className="text-2xl font-semibold font-serif text-gray-800">
                    {step.title}
                  </h3>

                  <p className="mt-3 font-serif text-gray-500">
                    {step.desc}
                  </p>
                </div>

                <div className="w-[260px] h-[170px] rounded-xl overflow-hidden shadow-md">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}