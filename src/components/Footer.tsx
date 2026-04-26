"use client";

import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-linear-to-b from-gray-900 to-gray-800 pt-20 px-10">
      
      {/* Overlay blur for glass feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

        {/* Column 1 */}
        <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-serif font-semibold text-white mb-4">
             <span className="text-cyan-400">MEDI</span>
        <span
          className="text-white font-serif"
        >
          CONNECT
        </span>
          </h3>
          <p className="text-gray-300 text-sm font-serif leading-relaxed">
            Your centralized platform for accessing quality healthcare across the city.
          </p>
        </div>

        {/* Column 2 */}
        <div className="backdrop-blur-lg bg-white/5 border font-serif border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-serif font-semibold text-white mb-4">
            Quick Links
          </h3>
          <ul className="space-y-2 text-gray-300 text-sm font-serif">
            <li className="hover:text-white cursor-pointer transition">Home</li>
            <li className="hover:text-white cursor-pointer transition">Find Doctors</li>
            <li className="hover:text-white cursor-pointer transition">Hospitals</li>
          </ul>
        </div>

        {/* Column 3 */}
        <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-serif font-semibold text-white mb-4">
            Services
          </h3>
          <ul className="space-y-2 text-gray-300 text-sm font-serif">
            <li className="hover:text-white transition">Online Appointments</li>
            <li className="hover:text-white transition">Specialist Consultations</li>
            <li className="hover:text-white transition">Hospital Network</li>
            <li className="hover:text-white transition">Medical Records</li>
          </ul>
        </div>

        {/* Column 4 */}
        <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-serif font-semibold text-white mb-4">
            Contact Us
          </h3>

          <div className="space-y-3 text-gray-300 text-sm font-serif">

            <div className="flex items-center gap-3">
              <Phone size={16} className="text-cyan-400" />
              <span>+91 70877 87088</span>
            </div>

            <div className="flex items-center gap-3">
              <Mail size={16} className="text-cyan-400" />
              <span>support@mediconnect.com</span>
            </div>

            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-cyan-400 font-serif mt-1" />
              <span>
                CSE Department, Thapar Institute of Engineering and Technology, Patiala 
              </span>
            </div>

          </div>
        </div>

      </div>
      <div>
      <div className="flex justify-center font-serif text-white text-center py-6">
      <p>© {new Date().getFullYear()} Mediconnect. All rights reserved.</p>
    </div>
    </div>
    </footer>
  );
}


 
