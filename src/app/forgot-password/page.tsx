"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import AuthCard, { inputClass, labelClass, primaryButtonClass } from "@/components/auth/AuthCard";

const loginPages = {
  patient: "/Patient_login",
  doctor: "/Doctor_login",
  admin: "/admin/login",
  hospital: "/hospital/login",
} as const;

type Role = keyof typeof loginPages;

function ForgotPasswordForm() {
  const params = useSearchParams();
  const initialRole = params.get("role");
  const [role, setRole] = useState<Role>(
    initialRole === "doctor" || initialRole === "admin" || initialRole === "hospital" ? initialRole : "patient"
  );
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, email: email.trim() }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setMessage(data.message);
  };

  return (
    <AuthCard
      title="Forgot Password"
      subtitle="Enter your email and we will send you a link to set a new password"
    >
      {message ? (
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>I am a</label>
            <select
              className={inputClass}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="hospital">Hospital staff</option>
              {role === "admin" ? <option value="admin">Admin</option> : null}
            </select>
          </div>

          <div>
            <label className={labelClass}>Email Address</label>
            <input
              type="email"
              placeholder="your@email.com"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Remembered it?{" "}
        <Link href={loginPages[role]} className="text-blue-500 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
