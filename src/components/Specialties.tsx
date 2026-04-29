import SpecialtyCard from "./SpecialtyCard";

export default function Specialties() {
  const data = [
    {
      title: "Cardiology",
      image: "images/cardiology.jpg",
      icon: "❤️",
      gradient: "bg-gradient-to-r from-red-300/70 to-red-200/40",
      quote: "Heart health tips",
      quotes: [
        "Move daily: even 20 minutes helps your heart.",
        "Cut excess salt and sugary drinks.",
        "Know your BP and cholesterol numbers.",
        "Sleep well—recovery protects your heart.",
      ],
    },
    {
      title: "Neurology",
      image: "images/neurology.webp",
      icon: "🧠",
      gradient: "bg-gradient-to-r from-purple-300/70 to-indigo-200/40",
      quote: "Brain health tips",
      quotes: [
        "Prioritize sleep—your brain “cleans up” at night.",
        "Hydration improves focus and reduces headaches.",
        "Take stress breaks: breathe, walk, reset.",
        "Limit screens before bed for deeper rest.",
      ],
    },
    {
      title: "General Medicine",
      image: "images/gen_medicine.jpg",
      icon: "🩺",
      gradient: "bg-gradient-to-r from-blue-300/70 to-cyan-200/40",
      quote: "Wellness tips",
      quotes: [
        "Prevention wins—don’t skip regular checkups.",
        "Track symptoms early and stay consistent.",
        "Keep vaccines and screenings up to date.",
        "Healthy habits beat quick fixes.",
      ],
    },
  ];

  return (
    <section className="px-10 py-20 bg-gray-50">
      {/* Heading */}
      <div className="mb-12">
        <p className="text-sm font-serif tracking-widest text-gray-400 uppercase">
          Medical Specialties
        </p>
        <h2 className="text-5xl font-serif font-bold text-gray-800 mt-2">
          Explore Our Specializations
        </h2>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {data.map((item, index) => (
          <SpecialtyCard key={index} {...item} />
        ))}
      </div>
    </section>
  );
}