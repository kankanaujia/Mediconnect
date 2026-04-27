"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
};

type Booking = {
  appointment_date: string;
  appointment_time: string;
  meta: {
    status: "booked" | "completed";
  };
};

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
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/Patient_login");
      return;
    }

    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) {
      setAvailableTimes([]);
      setSelectedTime("");
      return;
    }

    void loadSpecialAvailability(selectedDoctorId, selectedDate);
  }, [selectedDoctorId, selectedDate]);

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

  const loadBaseData = async () => {
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

  const loadSpecialAvailability = async (doctorId: string, date: string) => {
    setLoadingTimes(true);

    const [scheduleRes, bookingsRes] = await Promise.all([
      fetch(`/api/schedules?doctor_id=${doctorId}`),
      fetch(`/api/bookings?doctor_id=${doctorId}`),
    ]);

    const [scheduleData, bookingsData] = await Promise.all([
      scheduleRes.json(),
      bookingsRes.json(),
    ]);

    const nextSchedules = Array.isArray(scheduleData)
      ? (scheduleData as ScheduleEntry[])
      : [];
    const activeBookings = Array.isArray(bookingsData)
      ? (bookingsData as Booking[]).filter((booking) => booking.meta.status !== "completed")
      : [];

    const blockedTimes = activeBookings
      .filter((booking) => booking.appointment_date === date)
      .map((booking) => booking.appointment_time.slice(0, 5));

    setScheduleEntries(nextSchedules);
    setAvailableTimes(generateSpecialAppointmentTimes(nextSchedules, date, blockedTimes));
    setLoadingTimes(false);
  };

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
    <div className="min-h-screen bg-[#f9fafb] px-6 pb-20 pt-28 lg:px-24">
      <button
        onClick={() => router.push("/patient-dashboard")}
        className="mb-6 text-sm text-blue-500"
      >
        Back to dashboard
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
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
              }}
              className="rounded-2xl border border-gray-200 p-2 text-gray-800"
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
              }}
              className="rounded-2xl border border-gray-200 p-4 text-gray-800"
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
              }}
              className="rounded-2xl border border-gray-200 p-4"
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
              }}
              className="rounded-2xl border text-gray-800 border-gray-200 p-4"
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

        <aside className="rounded-[28px] bg-[#111111] p-6 text-white shadow-sm sm:p-8">
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
              Schedule items loaded:{" "}
              <span className="text-white">{scheduleEntries.length}</span>
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
