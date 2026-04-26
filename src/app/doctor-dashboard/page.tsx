"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash2 } from "lucide-react";
import {
  dayOptions,
  sortSchedules,
  type ScheduleCategory,
  type ScheduleEntry,
} from "@/lib/doctorSchedule";

type Slot = {
  id: string;
  doctor_id: string;
  date: string;
  duration: number;
  location: string;
};

type Booking = {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  meta: {
    kind: "daily" | "special";
    status: "booked" | "completed";
    slotId?: string;
    paymentStatus?: "pending" | "paid" | "failed";
  };
  patient_name: string;
  hospital_name: string;
};

type DoctorUser = {
  id: string;
  name: string;
  email: string;
  specialization?: string;
  hospital_id?: string;
};

const scheduleCategories: ScheduleCategory[] = [
  "Daily Slot 1",
  "Daily Slot 2",
  "Daily Slot 3",
  "Hospital Round",
  "Patient Visitation",
  "Special Appointment",
  "Other",
];

const emptyScheduleForm = {
  dayOfWeek: "1",
  title: "Daily Slot" as ScheduleCategory,
  startTime: "09:00",
  endTime: "09:20",
  notes: "",
};

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<DoctorUser | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [slotForm, setSlotForm] = useState({
    date: "",
    duration: "20",
    location: "",
  });
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);

  useEffect(() => {
    const storedUser = localStorage.getItem("doctor");

    if (!storedUser) {
      router.push("/Doctor_login");
      return;
    }

    const parsed = JSON.parse(storedUser) as DoctorUser;
    setUser(parsed);
    void loadDoctorData(parsed.id);
  }, [router]);

  const loadDoctorData = async (doctorId: string) => {
    setLoading(true);

    const [slotsRes, bookingsRes, schedulesRes] = await Promise.all([
      fetch(`/api/slots?doctor_id=${doctorId}`),
      fetch(`/api/bookings?doctor_id=${doctorId}`),
      fetch(`/api/schedules?doctor_id=${doctorId}`),
    ]);

    const [slotsData, bookingsData, schedulesData] = await Promise.all([
      slotsRes.json(),
      bookingsRes.json(),
      schedulesRes.json(),
    ]);

    setSlots(Array.isArray(slotsData) ? slotsData : []);
    setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    setSchedules(
      Array.isArray(schedulesData) ? sortSchedules(schedulesData) : [],
    );
    setLoading(false);
  };

  const activeBookings = useMemo(
    () => bookings.filter((booking) => booking.meta.status !== "completed"),
    [bookings],
  );

  const isSlotBooked = (slot: Slot) =>
    activeBookings.some((booking) => {
      if (booking.meta.slotId) {
        return booking.meta.slotId === slot.id;
      }

      const slotDate = new Date(slot.date);
      const dateText = slotDate.toISOString().slice(0, 10);
      const timeText = slotDate.toTimeString().slice(0, 5);
      return (
        booking.appointment_date === dateText &&
        booking.appointment_time.slice(0, 5) === timeText
      );
    });

  const availableSlots = useMemo(
    () => slots.filter((slot) => !isSlotBooked(slot)),
    [slots, activeBookings],
  );

  const handleLogout = () => {
    localStorage.removeItem("doctor");
    router.push("/Doctor_login");
  };

  const handleCreateSlot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) return;

    const res = await fetch("/api/slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        doctor_id: user.id,
        date: slotForm.date,
        duration: Number(slotForm.duration),
        location: slotForm.location,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to create slot");
      return;
    }

    setSlots((prev) => [...prev, data]);
    setSlotForm({ date: "", duration: "20", location: "" });
  };

  const handleDeleteSlot = async (id: string) => {
    const res = await fetch("/api/slots", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      return;
    }

    setSlots((prev) => prev.filter((slot) => slot.id !== id));
  };

  const handleUpdateSlot = async () => {
    if (!editingSlot) return;

    const res = await fetch("/api/slots", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editingSlot),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to update slot");
      return;
    }

    setSlots((prev) => prev.map((slot) => (slot.id === data.id ? data : slot)));
    setEditingSlot(null);
  };

  const handleScheduleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setScheduleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSchedule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) return;

    const payload = {
      doctor_id: user.id,
      dayOfWeek: Number(scheduleForm.dayOfWeek),
      title: scheduleForm.title,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      notes: scheduleForm.notes,
    };

    const res = await fetch("/api/schedules", {
      method: editingScheduleId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        editingScheduleId ? { id: editingScheduleId, ...payload } : payload,
      ),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to save schedule");
      return;
    }

    setSchedules((prev) => {
      const next = editingScheduleId
        ? prev.map((entry) => (entry.id === data.id ? data : entry))
        : [...prev, data];

      return sortSchedules(next);
    });

    setEditingScheduleId(null);
    setScheduleForm(emptyScheduleForm);
  };

  const handleEditSchedule = (entry: ScheduleEntry) => {
    setEditingScheduleId(entry.id ?? null);
    setScheduleForm({
      dayOfWeek: String(entry.dayOfWeek),
      title: entry.title,
      startTime: entry.startTime,
      endTime: entry.endTime,
      notes: entry.notes,
    });
  };

  const handleDeleteSchedule = async (id: string) => {
    const res = await fetch("/api/schedules", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      return;
    }

    setSchedules((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleMarkCompleted = async (bookingId: string) => {
    const res = await fetch("/api/bookings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bookingId,
        status: "completed",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to update booking");
      return;
    }

    setBookings((prev) =>
      prev.map((booking) => (booking.id === data.id ? data : booking)),
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-24 lg:px-24">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Doctor Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Welcome, {user.name || user.email}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-100 px-5 py-2 text-red-600 hover:bg-red-200"
        >
          Logout
        </button>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 font-serif text-gray-800 md:grid-cols-4">
        {[
          { label: "Daily Slots", value: slots.length },
          { label: "Available", value: availableSlots.length },
          { label: "Booked", value: activeBookings.length },
          {
            label: "Completed",
            value: bookings.filter((b) => b.meta.status === "completed").length,
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{item.label}</p>
            <h2 className="mt-1 text-2xl font-bold">{item.value}</h2>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <section className="rounded-2xl bg-blue-50 p-6 text-gray-800 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Daily Slots</h2>

            <form
              onSubmit={handleCreateSlot}
              className="grid gap-4 md:grid-cols-3"
            >
              <input
                type="datetime-local"
                value={slotForm.date}
                onChange={(e) =>
                  setSlotForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="rounded-lg border p-3"
                required
              />

              <input
                type="number"
                min="10"
                step="10"
                value={slotForm.duration}
                onChange={(e) =>
                  setSlotForm((prev) => ({ ...prev, duration: e.target.value }))
                }
                className="rounded-lg border p-3"
                required
              />

              <input
                type="text"
                placeholder="Hospital or room location"
                value={slotForm.location}
                onChange={(e) =>
                  setSlotForm((prev) => ({ ...prev, location: e.target.value }))
                }
                className="rounded-lg border p-3"
                required
              />

              <button className="col-span-full rounded-lg bg-gray-800 py-3 text-white hover:bg-black">
                Create Daily Slot
              </button>
            </form>

            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-sm text-gray-500">Loading slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="rounded-xl bg-white p-4 text-sm text-gray-500">
                  No open daily slots yet.
                </p>
              ) : (
                availableSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-col justify-between gap-4 rounded-xl bg-white p-5 shadow-sm md:flex-row md:items-center"
                  >
                    <div>
                      <p className="text-gray-700">
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

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingSlot(slot)}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSlot(slot.id)}
                        className="rounded-lg bg-red-100 px-3 py-2 text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Booked Appointments
              </h2>
            </div>

            <div className="space-y-4">
              {bookings.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  No bookings yet.
                </p>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-gray-900">
                          {booking.patient_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.hospital_name} •{" "}
                          {booking.meta.kind === "special"
                            ? "Special Appointment"
                            : "Daily Slot"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {booking.appointment_date} at{" "}
                          {booking.appointment_time}
                        </p>
                        {booking.reason ? (
                          <p className="text-sm text-gray-600">
                            Reason: {booking.reason}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            booking.meta.paymentStatus === "paid"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {booking.meta.paymentStatus === "paid"
                            ? "Payment Paid"
                            : "Payment Pending"}
                        </span>

                        {booking.meta.status !== "completed" ? (
                          <button
                            type="button"
                            onClick={() => void handleMarkCompleted(booking.id)}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
                          >
                            Mark Completed
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">
            Daily Schedule
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            Manage the order of daily slots, rounds, patient visitation, and
            special appointments.
          </p>

          <form
            onSubmit={handleSaveSchedule}
            className="space-y-4 rounded-xl bg-gray-50 p-4 text-gray-600"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <select
                name="dayOfWeek"
                value={scheduleForm.dayOfWeek}
                onChange={handleScheduleChange}
                className="rounded-lg border bg-white p-3"
              >
                {dayOptions.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>

              <select
                name="title"
                value={scheduleForm.title}
                onChange={handleScheduleChange}
                className="rounded-lg border bg-white p-3"
              >
                {scheduleCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="time"
                name="startTime"
                value={scheduleForm.startTime}
                onChange={handleScheduleChange}
                className="rounded-lg border bg-white p-3"
                required
              />
              <input
                type="time"
                name="endTime"
                value={scheduleForm.endTime}
                onChange={handleScheduleChange}
                className="rounded-lg border bg-white p-3"
                required
              />
            </div>

            <textarea
              name="notes"
              value={scheduleForm.notes}
              onChange={handleScheduleChange}
              placeholder="Notes for hospital staff"
              className="min-h-88px w-full rounded-lg border bg-white p-3"
            />

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
              >
                {editingScheduleId ? "Update Schedule" : "Add Schedule Item"}
              </button>

              {editingScheduleId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingScheduleId(null);
                    setScheduleForm(emptyScheduleForm);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {schedules.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                No daily schedule items yet.
              </p>
            ) : (
              schedules.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {entry.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {dayOptions[entry.dayOfWeek]} • {entry.startTime} -{" "}
                        {entry.endTime}
                      </p>
                      {entry.notes ? (
                        <p className="mt-2 text-sm text-gray-600">
                          {entry.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditSchedule(entry)}
                        className="rounded-lg bg-blue-100 p-2 text-blue-600"
                        aria-label="Edit schedule"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      {entry.id ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteSchedule(entry.id!)}
                          className="rounded-lg bg-red-100 p-2 text-red-600"
                          aria-label="Delete schedule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {editingSlot ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6">
            <h3 className="text-xl font-semibold text-gray-900">Edit Slot</h3>

            <input
              type="datetime-local"
              value={editingSlot.date}
              onChange={(e) =>
                setEditingSlot((prev) =>
                  prev ? { ...prev, date: e.target.value } : prev,
                )
              }
              className="w-full rounded-lg border p-3"
            />

            <input
              type="number"
              min="10"
              step="10"
              value={editingSlot.duration}
              onChange={(e) =>
                setEditingSlot((prev) =>
                  prev ? { ...prev, duration: Number(e.target.value) } : prev,
                )
              }
              className="w-full rounded-lg border p-3"
            />

            <input
              type="text"
              value={editingSlot.location}
              onChange={(e) =>
                setEditingSlot((prev) =>
                  prev ? { ...prev, location: e.target.value } : prev,
                )
              }
              className="w-full rounded-lg border p-3"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpdateSlot()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
