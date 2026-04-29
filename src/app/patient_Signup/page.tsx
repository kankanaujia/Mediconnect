"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, Loader2, LocateFixed } from "lucide-react";

type SignupForm = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  email: string;
  password: string;
  phone: string;
  location: string;
  address: string;
};

const inputClassName =
  "w-full rounded-2xl border border-[#cfd4dc] bg-white px-5 py-4 text-base text-[#161616] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#111111]";

export default function PatientSignup() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<SignupForm>({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    email: "",
    password: "",
    phone: "",
    location: "",
    address: "",
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digits }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser.");
      return;
    }

    setFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFormData((prev) => ({
          ...prev,
          location: `Lat ${coords.latitude.toFixed(5)}, Lng ${coords.longitude.toFixed(5)}`,
        }));
        setFetchingLocation(false);
      },
      () => {
        alert("Unable to retrieve your location.");
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("user", JSON.stringify(data));
      router.push("/patient-dashboard");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
      setLoading(false);
    }
  };

  return (
  <div className="bg-white">
    <div className="min-h-screen bg-radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(215,205,193,0.92)) px-4 py-28 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-6 rounded-[28px] bg-[#000000c7] p-5 shadow-[0_30px_90px_rgba(15,23,42,0.16)] lg:grid-cols-[0.95fr_1.85fr] lg:p-8">
        <aside className="relative overflow-hidden rounded-[22px] bg-[#434e4a] px-8 py-10 text-white sm:px-10 lg:min-h-880px lg:py-12">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                MediConnect
              </p>
              <h1 className="mt-8 max-w-sm font-serif text-5xl font-semibold leading-[0.98] sm:text-6xl">
                Create Your Profile
              </h1>
              <p className="mt-8 max-w-xs text-lg leading-8 text-white/80">
                Complete the form below to register for our patient portal and
                begin your journey to personalized healthcare.
              </p>
            </div>

            <p className="text-sm text-white/65">
              Secure and confidential registration.
            </p>
          </div>
        </aside>

        <section className="rounded-[22px] bg-white px-5 py-8 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:px-8 lg:px-10">
          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="space-y-7">
              <div>
                <h2 className="font-serif text-4xl font-semibold text-[#111111]">
                  Personal Information
                </h2>
                <div className="mt-5 h-px bg-[#111111]" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Field label="First Name *">
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  />
                </Field>

                <Field label="Last Name *">
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  />
                </Field>

                <Field label="Date of Birth *">
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  />
                </Field>

                <Field label="Gender *">
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  >
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="space-y-7">
              <div>
                <h2 className="font-serif text-4xl font-semibold text-[#111111]">
                  Contact Information
                </h2>
                <div className="mt-5 h-px bg-[#111111]" />
              </div>

              <div className="grid gap-6">
                <Field label="Email Address *">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Password *">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className={`${inputClassName} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 my-auto inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </Field>

                <Field label="Phone Number *">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    inputMode="numeric"
                    pattern="^[0-9]{10}$"
                    minLength={10}
                    maxLength={10}
                    autoComplete="tel"
                    placeholder="10-digit phone number"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Location *">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      placeholder="City, area, or current coordinates"
                      className={`${inputClassName} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={fetchingLocation}
                      className="inline-flex min-w-190px items-center justify-center gap-2 rounded-2xl border border-[#111111] px-4 py-4 text-sm font-medium text-[#111111] transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LocateFixed className="h-4 w-4" />
                      {fetchingLocation ? "Fetching..." : "Use Current Location"}
                    </button>
                  </div>
                </Field>

                <Field label="Address *">
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={5}
                    className={`${inputClassName} resize-none py-4`}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 border-t border-[#ece8e3] pt-6 sm:flex-row sm:items-center">
              <p className="text-sm text-[#5f5b56]">
                Already have an account?{" "}
                <Link
                  href="/Patient_login"
                  className="font-medium text-black underline underline-offset-4"
                >
                  Login here
                </Link>
              </p>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-w-260px items-center justify-center gap-3 rounded-2xl bg-black px-8 py-4 text-base font-medium text-white shadow-[0_16px_30px_rgba(0,0,0,0.18)] transition hover:bg-[#161616] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Completing Registration..." : "Complete Registration"}
              </button>
            </div>
          </form>
        </section>
      </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-3">
      <span className="text-lg font-medium text-[#1a1a1a]">{label}</span>
      {children}
    </label>
  );
}
