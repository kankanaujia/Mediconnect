"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DoctorLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔐 LOGIN HANDLER
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // ===========================
    // 🟡 DEV MODE LOGIN (Toggle via .env.local)
    // ===========================
    const isDevLoginEnabled =
  process.env.NEXT_PUBLIC_DEV_LOGIN === "true" || true;

if (
  isDevLoginEnabled &&
  cleanEmail === "doctor@demo.com" &&
  cleanPassword === "demo123"
) {
  const demoDoctor = {
    id: "demo-id",
    name: "Demo Doctor",
    email: cleanEmail,
    specialization: "General",
  };

  localStorage.setItem("doctor", JSON.stringify(demoDoctor));
  router.push("/doctor-dashboard");
  return;
}
    // ===========================

    // ===========================
    // 🔵 REAL DB LOGIN (Supabase)
    // ===========================
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("email", cleanEmail)
      .eq("approved", true)
      .single();

    if (error || !data) {
      alert("Invalid email");
      setLoading(false);
      return;
    }

    if (data.password !== cleanPassword) {
      alert("Incorrect password");
      setLoading(false);
      return;
    }

    // ✅ store doctor session
    localStorage.setItem("doctor", JSON.stringify(data));

    // ✅ redirect
    router.push("/doctor-dashboard");
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-6">

      <div className="w-full max-w-md pt-20">

        {/* TITLE */}
        <h1 className="text-3xl font-serif font-bold text-center text-gray-800">
          Doctor Login
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Access your appointment history and manage your bookings
        </p>

        {/* FORM */}
        <form onSubmit={handleLogin} className="mt-8 space-y-6">

          {/* EMAIL */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Email Address
            </label>

            <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3 bg-white">
              <span className="text-gray-400 mr-3">📧</span>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none text-gray-700"
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Password
            </label>

            <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3 bg-white">
              <span className="text-gray-400 mr-3">🔒</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none text-gray-700"
                required
              />
            </div>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition"
          >
            {loading ? "Logging in..." : "Login →"}
          </button>

        </form>

        {/* SIGN UP */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link href="/signup" className="text-blue-500 hover:underline">
            Sign up here
          </Link>
        </p>

        {/* DEMO BOX 
        <div className="mt-6 bg-[#dbeafe] text-gray-700 p-4 rounded-lg text-sm">
          <p className="font-medium mb-1">Demo Credentials:</p>
          <p>Email: doctor@demo.com</p>
          <p>Password: demo123</p>
        </div>*/}

        {/* FOOT NOTE */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Are you a Patient?{" "}
          <Link href="/Patient_login" className="text-blue-500 hover:underline">
            Login here
          </Link>
        </p>

      </div>
    </div>
  );
}