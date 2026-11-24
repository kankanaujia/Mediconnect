"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthCard, { inputClass, labelClass, primaryButtonClass } from "@/components/auth/AuthCard";

export default function HospitalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "hospital", email: email.trim(), password: password.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Invalid email or password");
      return;
    }
    router.push("/hospital");
  };

  return (
    <AuthCard title="Hospital Login" subtitle="Manage your doctors, their schedules and appointments">
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm text-gray-600">Password</label>
            <Link href="/forgot-password?role=hospital" className="text-sm text-blue-500 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        New hospital?{" "}
        <Link href="/hospital/signup" className="text-blue-500 hover:underline">
          Register here
        </Link>
      </p>
    </AuthCard>
  );
}
