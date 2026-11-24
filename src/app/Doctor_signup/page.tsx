"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import AuthCard, { inputClass, labelClass, primaryButtonClass } from "@/components/auth/AuthCard";

const SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "ENT",
  "Gastroenterology",
  "General Medicine",
  "Gynecology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
];

type Hospital = { id: string; name: string; location: string | null };

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  specialization: "",
  hospital_id: "",
  qualifications: "",
  experience_years: "",
  consultation_fee: "",
  bio: "",
};

export default function DoctorSignupPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hospitals")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHospitals((data as Hospital[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/doctors/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Sign-up failed");
      return;
    }
    setDone(data.message);
  };

  if (done) {
    return (
      <AuthCard title="Application Received">
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{done}</div>
        <Link href="/Doctor_login" className={`${primaryButtonClass} mt-6 block text-center`}>
          Back to doctor login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Doctor Sign Up"
      subtitle="Join MediConnect. Your account is activated after an admin reviews it."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>Full name *</label>
          <input name="name" className={inputClass} value={form.name} onChange={update} placeholder="Dr. Asha Verma" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Email *</label>
            <input name="email" type="email" className={inputClass} value={form.email} onChange={update} required />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="phone" type="tel" className={inputClass} value={form.phone} onChange={update} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Password * (min 8 characters)</label>
          <input name="password" type="password" minLength={8} className={inputClass} value={form.password} onChange={update} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Specialization *</label>
            <select name="specialization" className={inputClass} value={form.specialization} onChange={update} required>
              <option value="">Select</option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Hospital *</label>
            <select name="hospital_id" className={inputClass} value={form.hospital_id} onChange={update} required>
              <option value="">Select</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Qualifications</label>
          <input name="qualifications" className={inputClass} value={form.qualifications} onChange={update} placeholder="MBBS, MD (Cardiology)" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Experience (years)</label>
            <input name="experience_years" type="number" min={0} className={inputClass} value={form.experience_years} onChange={update} />
          </div>
          <div>
            <label className={labelClass}>Consultation fee (₹)</label>
            <input name="consultation_fee" type="number" min={0} className={inputClass} value={form.consultation_fee} onChange={update} />
          </div>
        </div>

        <div>
          <label className={labelClass}>About you</label>
          <textarea name="bio" rows={3} className={inputClass} value={form.bio} onChange={update} placeholder="A short introduction patients will see on your profile" />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Submitting..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already registered?{" "}
        <Link href="/Doctor_login" className="text-blue-500 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
