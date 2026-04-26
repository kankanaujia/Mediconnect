"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ❌ REMOVED login links from here
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Doctors", href: "/Doctors" },
    { name: "Hospitals", href: "/Hospitals" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-10 py-5 transition-all duration-300 backdrop-blur-md bg-white/70 border-b border-gray-200">

      {/* LOGO */}
      <div className="text-2xl font-serif font-bold">
        <span className="text-cyan-400">MEDI</span>
        <span className="text-gray-800">CONNECT</span>
      </div>

      {/* NAV LINKS */}
      <div className="flex items-center gap-6 font-serif font-medium">

        <div className="flex items-center gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`
                  px-5 py-2 rounded-full transition-all duration-300
                  ${
                    isActive
                      ? "bg-gray-200 text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }
                `}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* SEPARATOR */}
        <span className="text-gray-300">|</span>

        {/* ✅ AUTH (FIXED WITH LINKS) */}
        <div className="flex items-center gap-3">

          <Link href="/Patient_login">
            <button className="px-5 py-2 rounded-full font-serif bg-gray-900 text-white hover:bg-gray-800 transition">
              Patient Login
            </button>
          </Link>

          <Link href="/Doctor_login">
            <button className="px-5 py-2 rounded-full font-serif bg-gray-200 text-gray-700 hover:bg-gray-300 transition">
              Doctor Login
            </button>
          </Link>

        </div>

      </div>
    </nav>
  );
}