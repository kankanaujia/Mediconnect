"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Me =
  | { loggedIn: false }
  | { loggedIn: true; role: "patient" | "doctor" | "admin"; name: string };

const dashboards = {
  patient: "/patient-dashboard",
  doctor: "/doctor-dashboard",
  admin: "/admin",
} as const;

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Hospitals", href: "/Hospitals" },
  { name: "Doctors", href: "/Doctors" },
];

const pill = "px-5 py-2 rounded-full font-serif bg-gray-200 text-gray-700 hover:bg-gray-300 transition";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  // Re-check on every page change so logging in or out updates the navbar.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: Me) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user");
    localStorage.removeItem("doctor");
    setMe({ loggedIn: false });
    router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-10 py-5 transition-all duration-300 backdrop-blur-md bg-white/70 border-b border-gray-200">
      <Link href="/" className="text-2xl font-serif font-bold">
        <span className="text-cyan-400">MEDI</span>
        <span className="text-gray-800">CONNECT</span>
      </Link>

      <div className="flex items-center gap-6 font-serif font-medium">
        <div className="flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`px-5 py-2 rounded-full transition-all duration-300 ${
                pathname === link.href
                  ? "bg-gray-200 text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <span className="text-gray-300">|</span>

        <div className="flex items-center gap-3">
          {me?.loggedIn ? (
            <>
              <Link href={dashboards[me.role]} className={pill} title={me.name}>
                {me.role === "admin" ? "Admin Panel" : "My Dashboard"}
              </Link>
              <button onClick={() => void logout()} className="px-5 py-2 rounded-full font-serif text-red-600 hover:bg-red-50 transition">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/Patient_login" className={pill}>
                Patient Login
              </Link>
              <Link href="/Doctor_login" className={pill}>
                Doctor Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
