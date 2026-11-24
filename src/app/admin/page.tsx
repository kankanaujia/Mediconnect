"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import RequestsList, { type DoctorRequest } from "@/components/panel/RequestsList";

type Stats = {
  patients: number;
  hospitals: number;
  doctors: { approved: number; pending: number; rejected: number };
  bookings: { total: number; booked: number; completed: number; cancelled: number; paid: number };
  revenuePaise: number;
};

type Doctor = {
  id: string;
  name: string;
  email: string;
  specialization: string;
  hospital_name: string;
  status: "approved" | "pending" | "rejected";
  phone: string | null;
  qualifications: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  bio: string | null;
  created_at: string | null;
};

type Hospital = {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  phone_number: string | null;
  email: string | null;
  registration_number: string | null;
  status: "approved" | "pending" | "rejected";
  doctor_count: number;
  staff: { name: string; email: string }[];
};

type Booking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  patient_name: string;
  doctor_name: string;
  hospital_name: string;
  meta: {
    kind: "daily" | "special";
    status: "booked" | "completed" | "cancelled";
    paymentStatus?: "pending" | "paid" | "failed" | "refunded";
    amount?: number;
  };
};

type Tab = "overview" | "requests" | "changes" | "doctors" | "hospitals" | "bookings";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "requests", label: "New Doctors" },
  { id: "changes", label: "Schedule Requests" },
  { id: "doctors", label: "Doctors" },
  { id: "hospitals", label: "Hospitals" },
  { id: "bookings", label: "Bookings" },
];

const rupees = (paise: number | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    (paise ?? 0) / 100
  );

const badge: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-gray-200 text-gray-600",
  booked: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-200 text-gray-600",
  paid: "bg-blue-100 text-blue-700",
  refunded: "bg-gray-200 text-gray-600",
  failed: "bg-rose-100 text-rose-700",
};

function Badge({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${badge[value] ?? "bg-gray-100 text-gray-700"}`}>
      {value}
    </span>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [hospitalForm, setHospitalForm] = useState({ name: "", location: "", phone_number: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [changeRequests, setChangeRequests] = useState<DoctorRequest[]>([]);

  const loadAll = useCallback(async () => {
    const [statsRes, doctorsRes, hospitalsRes, bookingsRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/doctors"),
      fetch("/api/admin/hospitals"),
      fetch("/api/admin/bookings"),
    ]);
    const changesRes = await fetch("/api/doctor-requests");

    if (statsRes.status === 401) {
      router.replace("/admin/login");
      return;
    }

    const [s, d, h, b] = await Promise.all([
      statsRes.json(),
      doctorsRes.json(),
      hospitalsRes.json(),
      bookingsRes.json(),
    ]);
    setStats(s);
    setDoctors(Array.isArray(d) ? d : []);
    setHospitals(Array.isArray(h) ? h : []);
    setBookings(Array.isArray(b) ? b : []);
    const c = await changesRes.json().catch(() => []);
    setChangeRequests(Array.isArray(c) ? c : []);
  }, [router]);

  const decideChange = async (id: string, action: "approve" | "reject", note: string) => {
    const res = await fetch(`/api/doctor-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not update the request");
    await loadAll();
  };

  const reviewHospital = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    const res = await fetch("/api/admin/hospitals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) alert(data.error || "Could not update the hospital");
    await loadAll();
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadAll();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  const reviewDoctor = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    const res = await fetch("/api/admin/doctors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      alert(data.error || "Could not update the doctor");
      return;
    }
    await loadAll();
  };

  const addHospital = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await fetch("/api/admin/hospitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hospitalForm),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Could not add the hospital");
      return;
    }
    setHospitalForm({ name: "", location: "", phone_number: "" });
    await loadAll();
  };

  const cancelBooking = async (booking: Booking) => {
    const paid = booking.meta.paymentStatus === "paid";
    if (
      !window.confirm(
        `Cancel ${booking.patient_name}'s appointment with ${booking.doctor_name}?${paid ? " The payment will be refunded in full." : ""}`
      )
    ) {
      return;
    }
    setBusyId(booking.id);
    const res = await fetch(`/api/bookings/${booking.id}/cancel`, { method: "POST" });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      alert(data.error || "Could not cancel the booking");
      return;
    }
    await loadAll();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const pending = doctors.filter((d) => d.status === "pending");
  const visibleDoctors = doctors.filter((d) => doctorFilter === "all" || d.status === doctorFilter);
  const visibleBookings = bookings.filter(
    (b) => bookingFilter === "all" || b.meta.status === bookingFilter
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] px-6 pb-16 pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-gray-500">Approve doctors, manage hospitals and review bookings</p>
          </div>
          <button
            onClick={() => void logout()}
            className="rounded-lg border border-red-500 px-5 py-2 text-red-600 transition hover:bg-red-50"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 flex gap-1 overflow-x-auto border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
              {(() => {
                const count =
                  t.id === "requests"
                    ? pending.length
                    : t.id === "changes"
                      ? changeRequests.filter((r) => r.status === "pending").length
                      : t.id === "hospitals"
                        ? hospitals.filter((h) => h.status === "pending").length
                        : 0;
                return count > 0 ? (
                  <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{count}</span>
                ) : null;
              })()}
            </button>
          ))}
        </div>

        {!stats ? (
          <p className="mt-10 text-gray-500">Loading...</p>
        ) : null}

        {stats && tab === "overview" ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
            <span>Doctors get today&apos;s appointment list every morning at 8:00 (after deploy).</span>
            <button
              onClick={async () => {
                const res = await fetch("/api/cron/doctor-agenda");
                const data = await res.json();
                alert(res.ok ? `Sent today's agenda to ${data.doctors} doctor(s) (${data.appointments} appointments).` : data.error);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
            >
              Send today&apos;s agendas now
            </button>
          </div>
        ) : null}

        {stats && tab === "overview" ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Patients", value: stats.patients },
              { label: "Approved doctors", value: stats.doctors.approved },
              { label: "Pending doctor requests", value: stats.doctors.pending },
              { label: "Hospitals", value: stats.hospitals },
              { label: "Upcoming bookings", value: stats.bookings.booked },
              { label: "Completed", value: stats.bookings.completed },
              { label: "Cancelled", value: stats.bookings.cancelled },
              { label: "Revenue collected", value: rupees(stats.revenuePaise) },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {stats && tab === "requests" ? (
          <div className="mt-8 space-y-4">
            {pending.length === 0 ? (
              <p className="rounded-xl border bg-white p-6 text-gray-500">No pending doctor requests.</p>
            ) : (
              pending.map((d) => (
                <div key={d.id} className="rounded-xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="text-lg font-semibold text-gray-900">{d.name}</p>
                      <p>
                        {d.specialization} • {d.hospital_name}
                      </p>
                      <p>
                        {d.email}
                        {d.phone ? ` • ${d.phone}` : ""}
                      </p>
                      {d.qualifications ? <p>Qualifications: {d.qualifications}</p> : null}
                      {d.experience_years !== null ? <p>Experience: {d.experience_years} years</p> : null}
                      {d.consultation_fee !== null ? <p>Fee: ₹{d.consultation_fee}</p> : null}
                      {d.bio ? <p className="max-w-2xl text-gray-500">{d.bio}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === d.id}
                        onClick={() => void reviewDoctor(d.id, "approve")}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === d.id}
                        onClick={() => void reviewDoctor(d.id, "reject")}
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {stats && tab === "changes" ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-gray-500">
              Schedule and slot changes doctors asked for. Hospitals with their own account approve these themselves; you can approve any of them.
            </p>
            <RequestsList requests={changeRequests} mode="decide" showHospital onDecide={decideChange} />
          </div>
        ) : null}

        {stats && tab === "doctors" ? (
          <div className="mt-8">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="all">All doctors</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Specialization</th>
                    <th className="px-4 py-3">Hospital</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDoctors.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-3">{d.specialization}</td>
                      <td className="px-4 py-3">{d.hospital_name}</td>
                      <td className="px-4 py-3">{d.email}</td>
                      <td className="px-4 py-3">
                        <Badge value={d.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.status !== "approved" ? (
                          <button
                            disabled={busyId === d.id}
                            onClick={() => void reviewDoctor(d.id, "approve")}
                            className="text-emerald-700 hover:underline"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            disabled={busyId === d.id}
                            onClick={() => void reviewDoctor(d.id, "reject")}
                            className="text-red-600 hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {stats && tab === "hospitals" ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <form onSubmit={addHospital} className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Add hospital</h2>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                placeholder="Hospital name"
                value={hospitalForm.name}
                onChange={(e) => setHospitalForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                placeholder="City / location"
                value={hospitalForm.location}
                onChange={(e) => setHospitalForm((p) => ({ ...p, location: e.target.value }))}
                required
              />
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                placeholder="Phone (optional)"
                value={hospitalForm.phone_number}
                onChange={(e) => setHospitalForm((p) => ({ ...p, phone_number: e.target.value }))}
              />
              <button className="w-full rounded-lg bg-gray-900 py-2 text-sm text-white hover:bg-black">
                Add hospital
              </button>
            </form>
            <div className="space-y-3 lg:col-span-2">
              {hospitals.map((h) => (
                <div key={h.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-sm text-gray-500">
                    <p className="font-semibold text-gray-900">{h.name}</p>
                    <p>
                      {h.location}
                      {h.phone_number ? ` • ${h.phone_number}` : ""}
                      {h.registration_number ? ` • Reg. ${h.registration_number}` : ""}
                    </p>
                    {h.address ? <p>{h.address}</p> : null}
                    {h.staff.length ? (
                      <p className="truncate">Staff: {h.staff.map((s) => `${s.name} (${s.email})`).join(", ")}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600">{h.doctor_count} doctors</span>
                    <Badge value={h.status} />
                    {h.status !== "approved" ? (
                      <button
                        disabled={busyId === h.id}
                        onClick={() => void reviewHospital(h.id, "approve")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Approve
                      </button>
                    ) : null}
                    {h.status === "pending" ? (
                      <button
                        disabled={busyId === h.id}
                        onClick={() => void reviewHospital(h.id, "reject")}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {stats && tab === "bookings" ? (
          <div className="mt-8">
            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="all">All bookings</option>
              <option value="booked">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Hospital</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBookings.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="whitespace-nowrap px-4 py-3">
                        {b.appointment_date} {b.appointment_time.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3">{b.patient_name}</td>
                      <td className="px-4 py-3">{b.doctor_name}</td>
                      <td className="px-4 py-3">{b.hospital_name}</td>
                      <td className="px-4 py-3">
                        <Badge value={b.meta.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={b.meta.paymentStatus ?? "pending"} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.meta.status === "booked" ? (
                          <button
                            disabled={busyId === b.id}
                            onClick={() => void cancelBooking(b)}
                            className="text-red-600 hover:underline disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
