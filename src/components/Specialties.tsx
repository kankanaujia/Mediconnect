import SpecialtyCard from "./SpecialtyCard";

export default function Specialties() {
  const data = [
    {
      title: "Cardiology",
      image: "images/cardiology.jpg",
      icon: "❤️",
      gradient: "bg-gradient-to-r from-red-300/70 to-red-200/40",
    },
    {
      title: "Neurology",
      image: "images/neurology.webp",
      icon: "🧠",
      gradient: "bg-gradient-to-r from-purple-300/70 to-indigo-200/40",
    },
    {
      title: "General Medicine",
      image: "images/gen_medicine.jpg",
      icon: "🩺",
      gradient: "bg-gradient-to-r from-blue-300/70 to-cyan-200/40",
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