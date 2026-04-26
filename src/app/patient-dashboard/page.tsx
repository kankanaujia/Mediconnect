"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { launchRazorpayCheckout } from "@/lib/razorpayClient";

type User = {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  password?: string;
  address?: string;
  location?: string;
  gender?: string;
  date_of_birth?: string;
};

type Hospital = {
  id: string;
  name: string;
  location: string;
};

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  hospital_id: string;
};

type Slot = {
  id: string;
  doctor_id: string;
  date: string;
  duration: number;
  location: string;
};

type Booking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  doctor_name: string;
  specialization: string;
  hospital_name: string;
  meta: {
    kind: "daily" | "special";
    status: "booked" | "completed";
    slotId?: string;
    paymentStatus?: "pending" | "paid" | "failed";
    paymentOrderId?: string;
    paymentId?: string;
    receiptId?: string;
    amount?: number;
    currency?: string;
  };
};

const profileInputClassName =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-gray-900";

const emptySlotSelection = {
  hospitalId: "",
  specialization: "",
  doctorId: "",
  reason: "",
};

export default function PatientDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [slotSelection, setSlotSelection] = useState(emptySlotSelection);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    location: "",
    address: "",
  });
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/Patient_login");
      return;
    }

    const parsedUser = JSON.parse(storedUser) as User;
    setUser(parsedUser);
    setProfileForm({
      first_name: parsedUser.first_name || parsedUser.name?.split(" ")[0] || "",
      last_name:
        parsedUser.last_name || parsedUser.name?.split(" ").slice(1).join(" ") || "",
      email: parsedUser.email || "",
      phone: parsedUser.phone || "",
      gender: parsedUser.gender || "",
      date_of_birth: parsedUser.date_of_birth || "",
      location: parsedUser.location || "",
      address: parsedUser.address || "",
    });
    void loadPatientBookings(parsedUser.id);
  }, [router]);

  useEffect(() => {
    if (!showSlotModal) return;

    void loadPickerData();
  }, [showSlotModal]);

  useEffect(() => {
    if (!slotSelection.doctorId) {
      setAvailableSlots([]);
      return;
    }

    void loadAvailableSlots(slotSelection.doctorId);
  }, [slotSelection.doctorId]);

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.name ||
    user?.email;

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const hospitalMatch = slotSelection.hospitalId
        ? doctor.hospital_id === slotSelection.hospitalId
        : true;
      const specializationMatch = slotSelection.specialization
        ? doctor.specialization === slotSelection.specialization
        : true;

      return hospitalMatch && specializationMatch;
    });
  }, [doctors, slotSelection.hospitalId, slotSelection.specialization]);

  const specializations = useMemo(() => {
    const relevantDoctors = doctors.filter((doctor) =>
      slotSelection.hospitalId ? doctor.hospital_id === slotSelection.hospitalId : true
    );
    return [...new Set(relevantDoctors.map((doctor) => doctor.specialization))].sort();
  }, [doctors, slotSelection.hospitalId]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/Patient_login");
  };

  const loadPatientBookings = async (patientId: string) => {
    const res = await fetch(`/api/bookings?patient_id=${patientId}`);
    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
  };

  const loadPickerData = async () => {
    const [hospitalResult, doctorResult] = await Promise.all([
      supabase.from("hospitals").select("id, name, location").order("name"),
      supabase
        .from("doctors")
        .select("id, name, specialization, hospital_id")
        .eq("approved", true)
        .order("name"),
    ]);

    setHospitals((hospitalResult.data as Hospital[]) ?? []);
    setDoctors((doctorResult.data as Doctor[]) ?? []);
  };

  const loadAvailableSlots = async (doctorId: string) => {
    setLoadingSlots(true);

    const [slotsRes, bookingsRes] = await Promise.all([
      fetch(`/api/slots?doctor_id=${doctorId}`),
      fetch(`/api/bookings?doctor_id=${doctorId}`),
    ]);

    const [slotsData, bookingsData] = await Promise.all([
      slotsRes.json(),
      bookingsRes.json(),
    ]);

    const activeBookings = Array.isArray(bookingsData)
      ? (bookingsData as Booking[]).filter((booking) => booking.meta.status !== "completed")
      : [];

    const nextSlots = Array.isArray(slotsData)
      ? (slotsData as Slot[]).filter((slot) => {
          const slotDate = new Date(slot.date);
          const slotDateText = slotDate.toISOString().slice(0, 10);
          const slotTimeText = slotDate.toTimeString().slice(0, 5);

          const alreadyBooked = activeBookings.some((booking) => {
            if (booking.meta.slotId) {
              return booking.meta.slotId === slot.id;
            }

            return (
              booking.appointment_date === slotDateText &&
              booking.appointment_time.slice(0, 5) === slotTimeText
            );
          });

          return !alreadyBooked && slotDate.getTime() >= Date.now();
        })
      : [];

    setAvailableSlots(nextSlots);
    setLoadingSlots(false);
  };

  const handleProfileChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextUser = {
      ...user,
      ...profileForm,
      name: `${profileForm.first_name} ${profileForm.last_name}`.trim(),
    } as User;

    if (!user?.id || user.id === "demo-patient") {
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setShowProfile(false);
      return;
    }

    setSavingProfile(true);

    const res = await fetch("/api/patients", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: user.id,
        ...profileForm,
      }),
    });

    const data = await res.json();
    setSavingProfile(false);

    if (!res.ok) {
      alert(data.error || "Failed to update profile");
      return;
    }

    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    setShowProfile(false);
  };

  const handleBookDailySlot = async (slot: Slot) => {
    if (!user) return;

    setBookingSlot(slot.id);
    const doctor = doctors.find((item) => item.id === slot.doctor_id);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_id: user.id,
        doctor_id: slot.doctor_id,
        hospital_id: doctor?.hospital_id,
        appointment_date: new Date(slot.date).toISOString().slice(0, 10),
        appointment_time: new Date(slot.date).toTimeString().slice(0, 5),
        reason: slotSelection.reason,
        kind: "daily",
        slot_id: slot.id,
      }),
    });

    const data = await res.json();
    setBookingSlot(null);

    if (!res.ok) {
      alert(data.error || "Failed to book slot");
      return;
    }

    setBookings((prev) => [data, ...prev]);
    setAvailableSlots((prev) => prev.filter((item) => item.id !== slot.id));
    setShowSlotModal(false);
    setSlotSelection(emptySlotSelection);

    try {
      await handlePayForBooking(data.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Payment was not completed.");
    }
  };

  const handlePayForBooking = async (bookingId: string) => {
    if (!user) return;

    await launchRazorpayCheckout({
      bookingId,
      patientName: displayName || "Patient",
      patientEmail: user.email,
      patientPhone: user.phone || "",
      onSuccess: async () => {
        await loadPatientBookings(user.id);
      },
    });
  };

  if (!mounted || !user) return null;

  return (
    <div className="relative min-h-screen bg-[#f6f9fc] px-6 pb-16 pt-28 md:px-20">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
          <p className="mt-2 text-gray-500">Welcome back, {displayName}</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-300 text-gray-700">
              <UserRound className="h-7 w-7" />
            </span>
            <span className="max-w-[140px] truncate text-sm font-medium text-gray-700">
              {displayName}
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-red-500 px-5 py-2 text-red-600 transition hover:bg-red-300"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-xl border bg-[#eaf3fb] p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              Booked Slot
            </h2>

            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="rounded-lg border bg-white p-5">
                  <p className="text-sm text-gray-600">
                    No booked slots yet. Use quick actions to reserve a slot.
                  </p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="rounded-lg border bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {booking.doctor_name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {booking.specialization} • {booking.hospital_name}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          {booking.appointment_date} at {booking.appointment_time}
                        </p>
                        {booking.reason ? (
                          <p className="mt-1 text-sm text-gray-600">
                            Reason: {booking.reason}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                          {booking.meta.kind === "special"
                            ? "Special Appointment"
                            : "Daily Slot"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            booking.meta.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {booking.meta.status === "completed"
                            ? "Completed"
                            : "Booked"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            booking.meta.paymentStatus === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {booking.meta.paymentStatus === "paid"
                            ? "Payment Paid"
                            : "Payment Pending"}
                        </span>
                        <div className="flex gap-2">
                          {booking.meta.paymentStatus !== "paid" ? (
                            <button
                              type="button"
                              onClick={() => void handlePayForBooking(booking.id)}
                              className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white"
                            >
                              Pay Now
                            </button>
                          ) : null}

                          {booking.meta.paymentStatus === "paid" ? (
                            <a
                              href={`/api/bookings/${booking.id}/receipt`}
                              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700"
                            >
                              Download Receipt
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-[#eaf3fb] p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              Appointment History
            </h2>

            <div className="rounded-lg border bg-white p-5">
              <p className="text-sm text-gray-600">
                Completed appointments will continue to appear here through the
                booked slot list.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-xl border bg-[#eaf3fb] p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              Quick Actions
            </h2>

            <div className="space-y-4">
              <button
                onClick={() => router.push("/book-appointment")}
                className="w-full rounded-lg border bg-white p-4 text-left transition hover:shadow"
              >
                Book Special Appointment
              </button>

              <button
                onClick={() => setShowSlotModal(true)}
                className="w-full rounded-lg border bg-white p-4 text-left transition hover:shadow"
              >
                View Slots
              </button>

              <button
                onClick={() => router.push("/Hospitals")}
                className="w-full rounded-lg border bg-white p-4 text-left transition hover:shadow"
              >
                Find Hospitals
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-[#eaf3fb] p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Stats</h2>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                Active Bookings:{" "}
                <b>{bookings.filter((booking) => booking.meta.status !== "completed").length}</b>
              </p>
              <p>
                Completed:{" "}
                <b>{bookings.filter((booking) => booking.meta.status === "completed").length}</b>
              </p>
              <p>
                Doctors Consulted: <b>{new Set(bookings.map((booking) => booking.doctor_name)).size}</b>
              </p>
            </div>
          </div>
        </div>
      </div>

      {showProfile && (
        <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/30 px-4 py-10 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl font-semibold text-gray-900">
                  Your Profile
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Review and update your details without leaving the dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100"
                aria-label="Close profile"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <ProfileField label="First Name">
                  <input
                    type="text"
                    name="first_name"
                    value={profileForm.first_name}
                    onChange={handleProfileChange}
                    required
                    className={profileInputClassName}
                  />
                </ProfileField>

                <ProfileField label="Last Name">
                  <input
                    type="text"
                    name="last_name"
                    value={profileForm.last_name}
                    onChange={handleProfileChange}
                    required
                    className={profileInputClassName}
                  />
                </ProfileField>

                <ProfileField label="Email">
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    required
                    className={profileInputClassName}
                  />
                </ProfileField>

                <ProfileField label="Phone Number">
                  <input
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    required
                    className={profileInputClassName}
                  />
                </ProfileField>

                <ProfileField label="Date of Birth">
                  <input
                    type="date"
                    name="date_of_birth"
                    value={profileForm.date_of_birth}
                    onChange={handleProfileChange}
                    required
                    className={profileInputClassName}
                  />
                </ProfileField>

                <ProfileField label="Gender">
                  <select
                    name="gender"
                    value={profileForm.gender}
                    onChange={handleProfileChange}
                    required
                    className={profileInputClassName}
                  >
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </ProfileField>
              </div>

              <ProfileField label="Location">
                <input
                  type="text"
                  name="location"
                  value={profileForm.location}
                  onChange={handleProfileChange}
                  required
                  className={profileInputClassName}
                />
              </ProfileField>

              <ProfileField label="Address">
                <textarea
                  name="address"
                  value={profileForm.address}
                  onChange={handleProfileChange}
                  required
                  rows={4}
                  className={`${profileInputClassName} resize-none`}
                />
              </ProfileField>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-[#171717] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSlotModal && (
        <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/30 px-4 py-10 backdrop-blur-[2px]">
          <div className="w-full max-w-4xl rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl font-semibold text-gray-900">
                  View Available Slots
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Select a hospital, specialist, and doctor to book an available
                  daily slot.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSlotModal(false);
                  setSlotSelection(emptySlotSelection);
                  setAvailableSlots([]);
                }}
                className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100"
                aria-label="Close slot selector"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={slotSelection.hospitalId}
                onChange={(e) =>
                  setSlotSelection({
                    hospitalId: e.target.value,
                    specialization: "",
                    doctorId: "",
                    reason: slotSelection.reason,
                  })
                }
                className="rounded-2xl border border-gray-200 p-4"
              >
                <option value="">Select Hospital</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>

              <select
                value={slotSelection.specialization}
                onChange={(e) =>
                  setSlotSelection((prev) => ({
                    ...prev,
                    specialization: e.target.value,
                    doctorId: "",
                  }))
                }
                className="rounded-2xl border border-gray-200 p-4"
              >
                <option value="">Select Specialist</option>
                {specializations.map((specialization) => (
                  <option key={specialization} value={specialization}>
                    {specialization}
                  </option>
                ))}
              </select>

              <select
                value={slotSelection.doctorId}
                onChange={(e) =>
                  setSlotSelection((prev) => ({ ...prev, doctorId: e.target.value }))
                }
                className="rounded-2xl border border-gray-200 p-4"
              >
                <option value="">Select Doctor</option>
                {filteredDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={slotSelection.reason}
              onChange={(e) =>
                setSlotSelection((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Reason for visit"
              className="mt-4 min-h-[88px] w-full rounded-2xl border border-gray-200 p-4"
            />

            <div className="mt-6 space-y-4">
              {loadingSlots ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Loading available slots...
                </p>
              ) : availableSlots.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Select a doctor to view open daily slots.
                </p>
              ) : (
                availableSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 p-5 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(slot.date).toLocaleDateString()} at{" "}
                        {new Date(slot.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {slot.duration} min • {slot.location}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={bookingSlot === slot.id}
                      onClick={() => void handleBookDailySlot(slot)}
                      className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#161616] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {bookingSlot === slot.id ? "Booking..." : "Book This Slot"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
