import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=2070')",
        }}
      />

      {/* White Curved Overlay */}
      <div className="absolute left-0 top-0 h-full w-1/2 bg-white/80 backdrop-blur-sm rounded-r-[200px]" />

      {/* Content */}
      <div className="relative z-10 flex items-center h-full px-16">
        {/* Left Text Section */}
        <div className="max-w-xl">
          <h1 className="text-6xl font-serif text-gray-700 leading-tight">
            Healthcare, <br />
            Access <br />
            <span className="text-cyan-400">Simplified.</span>
          </h1>

          <p className="mt-6 font-serif text-gray-600">
            Connect with specialized medical professionals across the city. Book
            appointments seamlessly through our digital platform.
          </p>

          <Link href="/Doctors">
            <button className="mt-8 px-6 py-3 font-serif bg-gray-800 text-white rounded-full shadow-lg">
              FIND YOUR DOCTOR
            </button>
          </Link>
        </div>

        {/* Right Glass Card */}
        <div className="absolute right-20 top-40 bg-white/70 backdrop-blur-lg p-6 rounded-2xl font-serif shadow-xl max-w-sm">
          <p className="text-gray-700 text-sm">
            Our platform integrates with leading healthcare facilities to
            provide you with seamless access to quality medical care.
          </p>
        </div>

        {/* Slider Dots 
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
          <div className="w-3 h-3 bg-black rounded-full"></div>
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
        </div>*/}
      </div>
    </section>
  );
}
