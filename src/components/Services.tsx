export default function Services() {
  const services = [
    {
      icon: "🔍",
      title: "Find Specialists",
      desc: "Browse doctors by medical specialization and expertise areas",
    },
    {
      icon: "📅",
      title: "Book Appointments",
      desc: "Schedule your visit at convenient time slots that work for you",
    },
    {
      icon: "👨‍⚕️",
      title: "Expert Doctors",
      desc: "Access profiles and credentials of experienced medical professionals",
    },
    {
      icon: "🏥",
      title: "Multiple Hospitals",
      desc: "Connect with healthcare providers across all major city facilities",
    },
  ];

  return (
    <section className="px-10 py-20 bg-white">
      
      {/* Top Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
        
        {/* Left */}
        <div>
          <p className="text-sm font-serif tracking-widest text-gray-400 uppercase">
            Our Services
          </p>
          <h2 className="text-5xl font-serif font-bold text-gray-800 mt-2 leading-tight">
            Comprehensive Medical <br /> Ecosystem
          </h2>
        </div>

        {/* Right */}
        <p className="text-gray-500 font-serif max-w-md mt-4 md:mt-18">
          Our platform integrates with leading healthcare facilities to provide
          you with seamless access to quality medical care.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 mb-12"></div>

      {/* Cards */}
      <div className="grid md:grid-cols-4 gap-0 border border-gray-200">
        {services.map((item, index) => (
          <div
            key={index}
            className="p-10 border-r border-gray-200 last:border-r-0 hover:bg-gray-50 transition-all duration-300"
          >
            {/* Icon */}
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-100 mb-6 text-xl">
              {item.icon}
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              {item.title}
            </h3>

            {/* Description */}
            <p className="text-gray-500 text-sm leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}