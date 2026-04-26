"use client";

import Image from "next/image";

const hospitals = [
  {
    name: "Manipal Hospitals",
    desc: "A leading healthcare provider committed to delivering comprehensive and compassionate medical services to the community.",
    address: "Bhupindra Road, Near 22 No. Phatak, Patiala, Punjab 147001 ",
    phone: "098881 98184",
    website: "https://www.manipalhospitals.com/",
    image: "/images/hospitals/hospital1.jpg",
  },
  {
    name: "Amar Hospital",
    desc: "Dedicated to excellence in patient care, medical education, and innovative research, serving patients with dignity and respect.",
    address: "27, Income Tax Office Rd, Bank Colony, Patiala, Punjab 147001",
    phone: "0175 222 2002",
    website: "https://amarhospital.com/",
    image: "/images/hospitals/hospital2.png",
  },
  {
    name: "Rajindra Hospital",
    desc: "Providing accessible and affordable healthcare services, focusing on preventative care and community wellness programs.",
    address:
      "Verka booth, Main gate, rajindra hospital, Sangrur road, beside Rajindera hospital, New Lal Bagh Colony, Patiala, Punjab 147001",
    phone: "0175 221 2542",
    website: "https://www.rajindrahospital.com",
    image: "/hospitals/hospital3.jpg",
  },
  {
    name: "Park Hospital",
    desc: "Specializing in advanced surgical procedures and critical care, equipped with state-of-the-art technology and expert medical staff.",
    address: "Heera Bagh, Patiala, Punjab 147002",
    phone: "07448000000",
    website: "https://www.parkhospital.in/",
    image: "/hospitals/hospital4.jpg",
  },
  {
    name: "Patiala Heart Institute and Multispeciality Hospital",
    desc: "A dedicated pediatric facility offering specialized care for infants, children, and adolescents in a child-friendly environment.",
    address: "2, Jagdish Marg, Rattan Nagar, Patiala, Punjab 147001",
    phone: "09888198184",
    website: "https://patialaheart.com/",
    image: "/images/hospitals/hospital5.jpg",
  },
];

export default function HospitalsPage() {
  return (
    <main className="bg-[#f6f7f9]">
      {/* HERO */}
      {/* HERO — SAME AS DOCTORS */}
      <section className="w-full bg-linear-to-r from-[#dfe8ee] via-[#d6e3ea] to-[#cfdde6] py-36 pt-48 mb-24 text-center">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-serif font-extrabold tracking-tight text-gray-900 leading-tight">
            Our Hospital{" "}
            <span className="text-[#81bfec] font-serif">Network</span>
          </h1>

          <p className="mt-6 font-serif text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Explore our partner healthcare facilities across the city, each
            committed to providing exceptional medical care and services.
          </p>
        </div>
      </section>

      {/* HOSPITAL LIST */}
      <section className="max-w-7xl mx-auto px-6 pb-24 space-y-28">
        {hospitals.map((hospital, index) => {
          const isReverse = index % 2 !== 0;

          return (
            <div
              key={index}
              className={`grid md:grid-cols-2 font-serif gap-14 items-center ${
                isReverse ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* IMAGE */}
              <div className={`${isReverse ? "order-2" : "order-1"}`}>
                <div className="rounded-2xl overflow-hidden shadow-md">
                  <Image
                    src={hospital.image}
                    alt={hospital.name}
                    width={300}
                    height={400}
                  />
                </div>
              </div>

              {/* TEXT */}
              <div className={`${isReverse ? "order-1" : "order-2"}`}>
                <h2 className="text-4xl md:text-5xl font-serif font-extrabold text-gray-900">
                  {hospital.name}
                </h2>

                <p className="mt-4 font-serif text-gray-600 text-lg leading-relaxed max-w-xl">
                  {hospital.desc}
                </p>

                {/* INFO CARD */}
                <div className="mt-6 bg-[#a8c1d3] rounded-2xl p-6 text-white shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-4 opacity-90">
                    <span>📍</span>
                    <p className="font-serif">{hospital.address}</p>
                  </div>

                  <div className="flex items-center gap-3 mb-4 opacity-90">
                    <span>📞</span>
                    <p className="font-serif">{hospital.phone}</p>
                  </div>

                  <div className="flex items-center gap-3 font-medium cursor-pointer hover:opacity-80 transition">
                    <span>🌐</span>
                    <p className="flex items-center gap-2 font-serif">
                      Visit Website →
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
