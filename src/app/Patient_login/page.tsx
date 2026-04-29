"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export default function PatientLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      router.push("/patient-dashboard");
    }
  }, [router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (cleanEmail === "patient@demo.com" && cleanPassword === "demo123") {
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "demo-patient",
          first_name: "Demo",
          last_name: "Patient",
          name: "Demo Patient",
          email: cleanEmail,
          phone: "",
          location: "",
          address: "",
          gender: "",
          date_of_birth: "",
        })
      );
      router.push("/patient-dashboard");
      return;
    }

    const res = await fetch(`/api/patients?email=${encodeURIComponent(cleanEmail)}`);
    const data = await res.json();

    if (!res.ok || !data || data.password !== cleanPassword) {
      alert(data.error || "Invalid credentials");
      return;
    }

    localStorage.setItem("user", JSON.stringify(data));
    router.push("/patient-dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-6">
      <div className="w-full max-w-md pt-20">
        <h1 className="text-center text-3xl font-bold text-gray-800">
          Patient Login
        </h1>

        <p className="mt-2 text-center text-gray-500">
          Access your appointment history and manage your bookings
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block text-sm text-gray-600">
              Email Address
            </label>

            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-3">
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full text-gray-700 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-600">Password</label>

            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-3">
              <input
                type="password"
                placeholder="••••••••"
                className="w-full text-gray-700 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gray-800 py-3 font-medium text-white transition hover:bg-gray-900"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          New here?{" "}
          <Link href="/patient_Signup" className="text-blue-500 hover:underline">
            Sign up here
          </Link>
        </p>
        {/*
        <div className="mt-6 rounded-lg bg-[#dbeafe] p-4 text-sm text-gray-700">
          <p className="mb-1 font-medium">Demo Credentials:</p>
          <p>Email: patient@demo.com</p>
          <p>Password: demo123</p>
        </div>*/}

        <p className="mt-6 text-center text-sm text-gray-500">
          Are you a doctor?{" "}
          <Link href="/Doctor_login" className="text-blue-500 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
