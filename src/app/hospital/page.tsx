"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import RequestsList, { type DoctorRequest } from "@/components/panel/RequestsList";

type Overview = {
  hospital: {
    id: string;
    name: string;
    location: string | null;
    address: string | null;
    phone_number: string | null;
    email: string | null;
    registration_number: string | null;
  };
  doctors: { approved: number; pending: number };
  bookings: { today: number; upcoming: number; completed: number; cancelled: number };
  revenuePaise: number;
  pendingRequests: number;
  next7: { date: string; count: number }[];
};

type Doctor = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialization: string;
  qualifications: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  status: "approved" | "pending" | "rejected";
};

type Booking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  reason: string;
  meta: {
    kind: "daily" | "special";
    status: "booked" | "completed" | "cancelled";
    paymentStatus?: "pending" | "paid" | "failed" | "refunded";
    amount?: number;
  };
};

type Tab = "overview" | "requests" | "doctors" | "appointments" | "profile";

const rupees = (paise = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

const badgeStyle: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-gray-200 text-gray-600",
  booked: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-200 text-gray-600",
  paid: "bg-blue-100 text-blue-700",
  refunded: "bg-gray-200 text-gray-600",
};

function Badge({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${badgeStyle[value] ?? "bg-gray-100 text-gray-700"}`}>
      {value}
    </span>
  );
}

export default function HospitalPanelPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [requests, setRequests] = useState<DoctorRequest[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingFilter, setBookingFilter] = useState("booked");
  const [profile, setProfile] = useState({ location: "", address: "", phone_number: "", email: "" });
  const [notice, setNotice] = useState("");

  const loadAll = useCallback(async () => {
    const res = await fetch("/api/hospital/overview");
    if (res.status === 401) {
      router.replace("/hospital/login");
      return;
    }
    const [o, r, d, b] = await Promise.all([
      res.json(),
      fetch("/api/doctor-requests").then((x) => x.json()),
      fetch("/api/hospital/doctors").then((x) => x.json()),
      fetch("/api/hospital/bookings").then((x) => x.json()),
    ]);
    setOverview(o);
    setProfile({
      location: o.hospital?.location ?? "",
      address: o.hospital?.address ?? "",
      phone_number: o.hospital?.phone_number ?? "",
      email: o.hospital?.email ?? "",
    });
    setRequests(Array.isArray(r) ? r : []);
    setDoctors(Array.isArray(d) ? d : []);
    setBookings(Array.isArray(b) ? b : []);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadAll();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  const decide = async (id: string, action: "approve" | "reject", note: string) => {
    const res = await fetch(`/api/doctor-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Could not update the request");
    } else {
      setNotice(action === "approve" ? "Request approved and applied." : "Request rejected.");
    }
    await loadAll();
  };

  const reviewDoctor = async (id: string, action: "approve" | "reject") => {
    const res = await fetch("/api/hospital/doctors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not update the doctor");
    await loadAll();
  };

  const cancelBooking = async (b: Booking) => {
    const paid = b.meta.paymentStatus === "paid";
    if (!window.confirm(`Cancel ${b.patient_name}'s appointment with ${b.doctor_name}?${paid ? " The payment will be refunded in full." : ""}`)) {
      return;
    }
    const res = await fetch(`/api/bookings/${b.id}/cancel`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not cancel");
    await loadAll();
  };

  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await fetch("/api/hospital/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Could not save");
      return;
    }
    setNotice("Hospital details saved.");
    await loadAll();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/hospital/login");
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const pendingDoctors = doctors.filter((d) => d.status === "pending");
  const visibleBookings = bookings.filter((b) => bookingFilter === "all" || b.meta.status === bookingFilter);
  const maxDay = Math.max(1, ...(overview?.next7.map((d) => d.count) ?? [1]));

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "requests", label: "Requests", count: pendingRequests.length },
    { id: "doctors", label: "Doctors", count: pendingDoctors.length },
    { id: "appointments", label: "Appointments" },
    { id: "profile", label: "Hospital Details" },
  ];

  return (
    <div className="min-h-screen bg-[#f9fafb] px-4 pb-16 pt-24 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">{overview?.hospital?.name ?? "Hospital Panel"}</h1>
            <p className="text-gray-500">{overview?.hospital?.location ?? "Manage doctors, schedules and appointments"}</p>
          </div>
          <button onClick={() => void logout()} className="rounded-lg border border-red-500 px-5 py-2 text-red-600 hover:bg-red-50">
            Logout
          </button>
        </div>

        {notice ? (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {notice}
            <button onClick={() => setNotice("")} className="text-emerald-700">✕</button>
          </div>
        ) : null}

        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
              {t.count ? <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{t.count}</span> : null}
            </button>
          ))}
        </div>

        {!overview ? <p className="mt-10 text-gray-500">Loading...</p> : null}

        {overview && tab === "overview" ? (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Appointments today", value: overview.bookings.today },
                { label: "Upcoming", value: overview.bookings.upcoming },
                { label: "Doctors", value: overview.doctors.approved },
                { label: "Revenue collected", value: rupees(overview.revenuePaise) },
                { label: "Pending requests", value: overview.pendingRequests },
                { label: "Doctors awaiting approval", value: overview.doctors.pending },
                { label: "Completed visits", value: overview.bookings.completed },
                { label: "Cancelled", value: overview.bookings.cancelled },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-xs text-gray-500 sm:text-sm">{card.label}</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900 sm:text-2xl">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Appointments in the next 7 days</h2>
              <div className="mt-4 flex h-40 items-end gap-2 sm:gap-4">
                {overview.next7.map((day) => (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs text-gray-600">{day.count}</span>
                    <div
                      className="w-full rounded-t-md bg-sky-400"
                      style={{ height: `${Math.max(4, (day.count / maxDay) * 110)}px` }}
                      title={`${day.count} appointments`}
                    />
                    <span className="text-[11px] text-gray-500">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {overview && tab === "requests" ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-gray-500">
              Doctors cannot change their slots or weekly schedule directly. Approving a request applies the change.
            </p>
            <RequestsList requests={requests} mode="decide" onDecide={decide} />
          </div>
        ) : null}

        {overview && tab === "doctors" ? (
          <div className="mt-8 space-y-3">
            {doctors.length === 0 ? <p className="rounded-xl border bg-white p-6 text-gray-500">No doctors yet.</p> : null}
            {doctors.map((d) => (
              <div key={d.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">{d.name}</p>
                  <p>
                    {d.specialization}
                    {d.experience_years !== null ? ` • ${d.experience_years} yrs` : ""}
                    {d.consultation_fee !== null ? ` • ₹${d.consultation_fee}` : ""}
                  </p>
                  <p className="truncate">
                    {d.email}
                    {d.phone ? ` • ${d.phone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={d.status} />
                  {d.status !== "approved" ? (
                    <button onClick={() => void reviewDoctor(d.id, "approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
                      Approve
                    </button>
                  ) : null}
                  {d.status === "pending" ? (
                    <button onClick={() => void reviewDoctor(d.id, "reject")} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                      Reject
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {overview && tab === "appointments" ? (
          <div className="mt-8">
            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="booked">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>
            <div className="mt-4 space-y-3">
              {visibleBookings.length === 0 ? <p className="rounded-xl border bg-white p-6 text-gray-500">No appointments.</p> : null}
              {visibleBookings.map((b) => (
                <div key={b.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">
                      {b.appointment_date} {b.appointment_time.slice(0, 5)} • {b.doctor_name}
                    </p>
                    <p>
                      Patient: {b.patient_name}
                      {b.patient_phone ? ` • ${b.patient_phone}` : ""}
                    </p>
                    {b.reason ? <p className="text-gray-500">Reason: {b.reason}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge value={b.meta.status} />
                    <Badge value={b.meta.paymentStatus ?? "pending"} />
                    {b.meta.status === "booked" ? (
                      <button onClick={() => void cancelBooking(b)} className="text-sm text-red-600 hover:underline">
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {overview && tab === "profile" ? (
          <form onSubmit={saveProfile} className="mt-8 max-w-xl space-y-4 rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Registration no.: {overview.hospital.registration_number || "—"} (name and registration number are changed by MediConnect)
            </p>
            {(
              [
                ["location", "City"],
                ["phone_number", "Phone"],
                ["email", "Contact email"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm text-gray-600">
                {label}
                <input
                  value={profile[key]}
                  onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800"
                />
              </label>
            ))}
            <label className="block text-sm text-gray-600">
              Address
              <textarea
                rows={3}
                value={profile.address}
                onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800"
              />
            </label>
            <button className="rounded-lg bg-gray-900 px-5 py-2 text-sm text-white hover:bg-black">Save details</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
