"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

type Role = "patient" | "doctor" | "admin" | "hospital";
type Me = { loggedIn: false } | { loggedIn: true; role: Role; name: string };

const dashboards: Record<Role, string> = {
  patient: "/patient-dashboard",
  doctor: "/doctor-dashboard",
  admin: "/admin",
  hospital: "/hospital",
};

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Hospitals", href: "/Hospitals" },
  { name: "Doctors", href: "/Doctors" },
];

const pill = "px-5 py-2 rounded-full font-serif bg-gray-200 text-gray-700 hover:bg-gray-300 transition text-center";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  // The mobile menu closes by itself when the page changes.
  const menuOpen = menuPath === pathname;
  const { lang, setLang, t } = useLang();

  const langToggle = (
    <button
      type="button"
      onClick={() => setLang(lang === "hi" ? "en" : "hi")}
      className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      aria-label={lang === "hi" ? "Switch to English" : "Hindi"}
    >
      {lang === "hi" ? "English" : "हिंदी"}
    </button>
  );

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
    setMenuPath(null);
    router.push("/");
  };

  const authLinks = me?.loggedIn ? (
    <>
      <Link href={dashboards[me.role]} className={pill} title={me.name}>
        {t(me.role === "admin" ? "Admin Panel" : me.role === "hospital" ? "Hospital Panel" : "My Dashboard")}
      </Link>
      <button
        onClick={() => void logout()}
        className="px-5 py-2 rounded-full font-serif text-red-600 hover:bg-red-50 transition"
      >
        {t("Logout")}
      </button>
    </>
  ) : (
    <>
      <Link href="/Patient_login" className={pill}>
        {t("Patient Login")}
      </Link>
      <Link href="/Doctor_login" className={pill}>
        {t("Doctor Login")}
      </Link>
    </>
  );

  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-white/80 border-b border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 md:px-10 md:py-5">
        <Link href="/" className="text-xl md:text-2xl font-serif font-bold">
          <span className="text-cyan-400">MEDI</span>
          <span className="text-gray-800">CONNECT</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6 font-serif font-medium">
          <div className="flex items-center gap-2 lg:gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`px-4 lg:px-5 py-2 rounded-full transition-all duration-300 ${
                  pathname === link.href
                    ? "bg-gray-200 text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t(link.name)}
              </Link>
            ))}
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-3">
            {langToggle}
            {authLinks}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2 md:hidden">
        {langToggle}
        <button
          type="button"
          onClick={() => setMenuPath(menuOpen ? null : pathname)}
          className="md:hidden rounded-lg p-2 text-gray-700 hover:bg-gray-100"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="md:hidden border-t border-gray-200 bg-white px-5 pb-5 pt-3 font-serif">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`rounded-lg px-3 py-2 ${
                  pathname === link.href ? "bg-gray-100 text-gray-900" : "text-gray-600"
                }`}
              >
                {t(link.name)}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">{authLinks}</div>
        </div>
      ) : null}
    </nav>
  );
}
