"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import AuthCard, { inputClass, labelClass, primaryButtonClass } from "@/components/auth/AuthCard";

const emptyForm = {
  hospital_name: "",
  location: "",
  address: "",
  phone_number: "",
  registration_number: "",
  contact_name: "",
  email: "",
  password: "",
};

export default function HospitalSignupPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const update = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/hospitals/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    setDone(data.message);
  };

  if (done) {
    return (
      <AuthCard title="Registration Received">
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{done}</div>
        <Link href="/hospital/login" className={`${primaryButtonClass} mt-6 block text-center`}>
          Go to hospital login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Register Your Hospital"
      subtitle="List your hospital on MediConnect. Patients can book your doctors once MediConnect approves the registration."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Hospital</p>
        <div>
          <label className={labelClass}>Hospital name *</label>
          <input name="hospital_name" className={inputClass} value={form.hospital_name} onChange={update} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>City *</label>
            <input name="location" className={inputClass} value={form.location} onChange={update} placeholder="Patiala" required />
          </div>
          <div>
            <label className={labelClass}>Phone *</label>
            <input name="phone_number" type="tel" className={inputClass} value={form.phone_number} onChange={update} required />
          </div>
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <textarea name="address" rows={2} className={inputClass} value={form.address} onChange={update} />
        </div>
        <div>
          <label className={labelClass}>Registration / licence number</label>
          <input name="registration_number" className={inputClass} value={form.registration_number} onChange={update} />
        </div>

        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your login</p>
        <div>
          <label className={labelClass}>Your name *</label>
          <input name="contact_name" className={inputClass} value={form.contact_name} onChange={update} placeholder="Hospital manager / front desk" required />
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input name="email" type="email" className={inputClass} value={form.email} onChange={update} required />
        </div>
        <div>
          <label className={labelClass}>Password * (min 8 characters)</label>
          <input name="password" type="password" minLength={8} className={inputClass} value={form.password} onChange={update} required />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Submitting..." : "Register hospital"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already registered?{" "}
        <Link href="/hospital/login" className="text-blue-500 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
