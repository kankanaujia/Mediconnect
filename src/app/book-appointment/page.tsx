"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateSpecialAppointmentTimes,
  type ScheduleEntry,
} from "@/lib/doctorSchedule";
import { launchRazorpayCheckout } from "@/lib/razorpayClient";

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
  consultation_fee: number | null;
};

// Must match src/lib/paymentConfig.ts (prices shown before checkout).
const DEFAULT_SPECIAL_FEE = 700;

type Booking = {
  appointment_date: string;
  appointment_time: string;
  meta: {
    status: "booked" | "completed" | "cancelled";
  };
};

async function fetchSpecialAvailability(doctorId: string, date: string) {
  const [scheduleRes, bookingsRes] = await Promise.all([
    fetch(`/api/schedules?doctor_id=${doctorId}`),
    fetch(`/api/bookings?doctor_id=${doctorId}`),
  ]);

  const [scheduleData, bookingsData] = await Promise.all([
    scheduleRes.json(),
    bookingsRes.json(),
  ]);

  const schedules = Array.isArray(scheduleData) ? (scheduleData as ScheduleEntry[]) : [];
  const activeBookings = Array.isArray(bookingsData)
    ? (bookingsData as Booking[]).filter((booking) => booking.meta.status === "booked")
    : [];

  const blockedTimes = activeBookings
    .filter((booking) => booking.appointment_date === date)
    .map((booking) => booking.appointment_time.slice(0, 5));

  return {
    schedules,
    times: generateSpecialAppointmentTimes(schedules, date, blockedTimes),
  };
}

export default function BookAppointment() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  // Which doctor+date the current availableTimes were loaded for.
  const [loadedAvailabilityKey, setLoadedAvailabilityKey] = useState("");
  const [saving, setSaving] = useState(false);

  const availabilityKey =
    selectedDoctorId && selectedDate ? `${selectedDoctorId}|${selectedDate}` : "";
  const loadingTimes = availabilityKey !== "" && loadedAvailabilityKey !== availabilityKey;

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/Patient_login");
      return;
    }

    // Restoring the saved login from localStorage on mount is a one-off sync
    // from an external store, which is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(JSON.parse(storedUser));
  }, [router]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const hospitalMatch = selectedHospitalId
        ? doctor.hospital_id === selectedHospitalId
        : true;
      const specializationMatch = selectedSpecialization
        ? doctor.specialization === selectedSpecialization
        : true;

      return hospitalMatch && specializationMatch;
    });
  }, [doctors, selectedHospitalId, selectedSpecialization]);

  const specializations = useMemo(() => {
    const relevantDoctors = doctors.filter((doctor) =>
      selectedHospitalId ? doctor.hospital_id === selectedHospitalId : true
    );

    return [...new Set(relevantDoctors.map((doctor) => doctor.specialization))].sort();
  }, [doctors, selectedHospitalId]);

  const selectedDoctor = filteredDoctors.find((doctor) => doctor.id === selectedDoctorId);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      fetch("/api/hospitals").then((res) => res.json()).then((data) => ({ data: Array.isArray(data) ? data : [] })),
      fetch("/api/doctors").then((res) => res.json()),
    ]).then(([hospitalResult, doctorData]) => {
      if (cancelled) return;
      const loadedDoctors = Array.isArray(doctorData) ? (doctorData as Doctor[]) : [];
      setHospitals((hospitalResult.data as Hospital[]) ?? []);
      setDoctors(loadedDoctors);

      // Opened from a doctor's profile: /book-appointment?doctor=<id>
      const requested = new URLSearchParams(window.location.search).get("doctor");
      const match = loadedDoctors.find((doctor) => doctor.id === requested);
      if (match) {
        setSelectedHospitalId(match.hospital_id);
        setSelectedSpecialization(match.specialization);
        setSelectedDoctorId(match.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!availabilityKey) return;
    let cancelled = false;

    fetchSpecialAvailability(selectedDoctorId, selectedDate)
      .catch(() => ({ schedules: [] as ScheduleEntry[], times: [] as string[] }))
      .then(({ times }) => {
        if (cancelled) return;
        setAvailableTimes(times);
        setLoadedAvailabilityKey(availabilityKey);
      });

    return () => {
      cancelled = true;
    };
  }, [availabilityKey, selectedDoctorId, selectedDate]);

  const handleConfirm = async () => {
    if (!user?.id || !selectedDoctor || !selectedDate || !selectedTime) {
      alert("Select hospital, specialist, doctor, date, and time.");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_id: user.id,
        doctor_id: selectedDoctor.id,
        hospital_id: selectedDoctor.hospital_id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        reason,
        kind: "special",
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      alert(data.error || "Failed to book appointment");
      return;
    }

    try {
      const patientName =
        [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
        user.name ||
        "Patient";

      await launchRazorpayCheckout({
        bookingId: data.id,
        patientName,
        patientEmail: user.email || "",
        patientPhone: user.phone || "",
        onSuccess: async () => {
          router.push("/patient-dashboard");
        },
      });
    } catch (error) {
      alert(
        error instanceof Error
          ? `${error.message} Your booking is saved as payment pending in your dashboard.`
          : "Payment was not completed. Your booking is saved as payment pending in your dashboard."
      );
      router.push("/patient-dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] px-4 pb-20 pt-24 sm:px-6 md:pt-28 lg:px-24">
      <button
        onClick={() => router.push("/patient-dashboard")}
        className="mb-6 text-sm text-blue-500"
      >
        Back to dashboard
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="min-w-0 rounded-[28px] bg-white p-5 shadow-sm sm:p-8">
          <h1 className="font-serif text-4xl font-semibold text-gray-900">
            Special Appointment
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-500">
            Book a specialist visit according to your preferred hospital, doctor,
            and the doctor&apos;s managed schedule. Each special appointment reserves
            a 20 minute slot.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 text-gray-800">
            <select
              value={selectedHospitalId}
              onChange={(e) => {
                setSelectedHospitalId(e.target.value);
                setSelectedSpecialization("");
                setSelectedDoctorId("");
                setSelectedTime("");
                setAvailableTimes([]);
              }}
              className="w-full min-w-0 rounded-2xl border border-gray-200 p-2 text-gray-800"
            >
              <option value="">Select Hospital</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>

            <select
              value={selectedSpecialization}
              onChange={(e) => {
                setSelectedSpecialization(e.target.value);
                setSelectedDoctorId("");
                setSelectedTime("");
                setAvailableTimes([]);
              }}
              className="w-full min-w-0 rounded-2xl border border-gray-200 p-4 text-gray-800"
            >
              <option value="">Select Specialist</option>
              {specializations.map((specialization) => (
                <option key={specialization} value={specialization}>
                  {specialization}
                </option>
              ))}
            </select>

            <select
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                setSelectedTime("");
                setAvailableTimes([]);
              }}
              className="w-full min-w-0 rounded-2xl border border-gray-200 p-4"
            >
              <option value="">Select Doctor</option>
              {filteredDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime("");
                setAvailableTimes([]);
              }}
              className="w-full min-w-0 rounded-2xl border text-gray-800 border-gray-200 p-4"
            />
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for special appointment"
            className="mt-4 min-h-120px w-full rounded-2xl border text-gray-800 border-gray-200 p-4"
          />

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">Available 20 minute slots</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {loadingTimes ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Checking availability...
                </p>
              ) : availableTimes.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Select a doctor and date. Special appointment times come from the
                  doctor&apos;s managed daily schedule.
                </p>
              ) : (
                availableTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      selectedTime === time
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
                    }`}
                  >
                    {time}
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="min-w-0 rounded-[28px] bg-[#111111] p-5 text-white shadow-sm sm:p-8">
          <h2 className="font-serif text-3xl font-semibold">Booking Summary</h2>
          <div className="mt-6 space-y-4 text-sm text-white/80">
            <p>
              Hospital:{" "}
              <span className="text-white">
                {hospitals.find((hospital) => hospital.id === selectedHospitalId)?.name ||
                  "Not selected"}
              </span>
            </p>
            <p>
              Specialist:{" "}
              <span className="text-white">
                {selectedSpecialization || "Not selected"}
              </span>
            </p>
            <p>
              Doctor:{" "}
              <span className="text-white">
                {selectedDoctor?.name || "Not selected"}
              </span>
            </p>
            <p>
              Date: <span className="text-white">{selectedDate || "Not selected"}</span>
            </p>
            <p>
              Time: <span className="text-white">{selectedTime || "Not selected"}</span>
            </p>
            <p>
              Fee:{" "}
              <span className="text-white">
                {selectedDoctor
                  ? `₹${selectedDoctor.consultation_fee && selectedDoctor.consultation_fee > 0 ? selectedDoctor.consultation_fee : DEFAULT_SPECIAL_FEE}`
                  : "Select a doctor"}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving || !selectedTime}
            className="mt-10 w-full rounded-2xl bg-white px-5 py-4 font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Booking..." : "Confirm Special Appointment"}
          </button>
        </aside>
      </div>
    </div>
  );
}
