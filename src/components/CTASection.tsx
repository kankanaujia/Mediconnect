"use client";

export default function CTASection() {
  return (
    <section className="w-full bg-[#edf4f8] py-40 text-center relative overflow-hidden">

      {/* SOFT GRADIENT GLOW (background feel) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(150,200,230,0.25),transparent_70%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">

        {/* TOP TAG */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-serif bg-white shadow-md text-sm text-[#8fb4c9] mb-6">
          🚀 JOIN OUR COMMUNITY
        </div>

        {/* HEADING */}
        <h2 className="text-[56px] font-serif font-extrabold leading-tight text-gray-800">
          Start Your Healthcare
          <br />
          <span className="text-[#b9d6ea] font-serif">Journey Today</span>
        </h2>

        {/* SUBTEXT */}
        <p className="mt-6 text-gray-500 text-lg font-serif max-w-2xl mx-auto">
          Create your account to access personalized doctor recommendations,
          save your medical preferences, and book appointments with ease.
        </p>

        {/* BUTTONS */}
        <div className="mt-10 flex items-center justify-center gap-6">

          {/* PRIMARY */}
          <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#9fc3d9] to-[#8fb4c9] text-gray-800 font-serif font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2">
            ✨ Create Patient Account →
          </button>

          {/* SECONDARY */}
          <button className="px-8 py-4 rounded-xl border border-gray-400 text-gray-700 font-serif font-medium hover:bg-gray-100 transition-all duration-200">
            Doctor Sign Up
          </button>

        </div>
      </div>
    </section>
  );
}