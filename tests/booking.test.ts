import { describe, expect, it } from "vitest";
import {
  appointmentStart,
  bookingColumns,
  bookingFromRow,
  parseBookingReason,
  serializeBookingReason,
} from "@/lib/bookingMeta";
import { sameClockTime } from "@/lib/bookingQueries";
import { generateSpecialAppointmentTimes, type ScheduleEntry } from "@/lib/doctorSchedule";

describe("booking metadata", () => {
  it("round-trips the reason and metadata", () => {
    const stored = serializeBookingReason("Chest pain", {
      kind: "special",
      status: "cancelled",
      paymentStatus: "refunded",
      amount: 70000,
      refundId: "rfnd_1",
      cancelledBy: "patient",
    });
    const parsed = parseBookingReason(stored);
    expect(parsed.reason).toBe("Chest pain");
    expect(parsed.meta).toMatchObject({
      kind: "special",
      status: "cancelled",
      paymentStatus: "refunded",
      amount: 70000,
      refundId: "rfnd_1",
      cancelledBy: "patient",
    });
  });

  it("falls back to safe defaults for old or broken values", () => {
    expect(parseBookingReason(null).meta).toMatchObject({ kind: "daily", status: "booked" });
    expect(parseBookingReason("plain old reason").reason).toBe("plain old reason");

    const tampered = serializeBookingReason("x").replace('"status":"booked"', '"status":"hacked"');
    expect(parseBookingReason(tampered).meta.status).toBe("booked");
  });

  it("reads appointment times as India time", () => {
    expect(appointmentStart("2026-11-26", "14:00:00").toISOString()).toBe(
      "2026-11-26T08:30:00.000Z"
    );
  });
});

describe("booking columns", () => {
  it("writes and reads the column format", () => {
    const columns = bookingColumns("Fever", {
      kind: "daily",
      slotId: "slot-1",
      status: "booked",
      paymentStatus: "paid",
      paymentId: "pay_1",
      amount: 30000,
    });
    expect(columns).toMatchObject({
      reason: "Fever",
      kind: "daily",
      slot_id: "slot-1",
      status: "booked",
      payment_status: "paid",
      payment_id: "pay_1",
      amount: 30000,
      refund_id: null,
    });

    const parsed = bookingFromRow(columns);
    expect(parsed.reason).toBe("Fever");
    expect(parsed.meta).toMatchObject({
      kind: "daily",
      slotId: "slot-1",
      paymentStatus: "paid",
      paymentId: "pay_1",
      amount: 30000,
    });
  });

  it("still reads rows saved in the old JSON format", () => {
    const legacy = { reason: serializeBookingReason("Old", { status: "completed", kind: "special" }), kind: null };
    const parsed = bookingFromRow(legacy);
    expect(parsed.reason).toBe("Old");
    expect(parsed.meta).toMatchObject({ status: "completed", kind: "special" });
  });
});

describe("double-booking check", () => {
  it("treats 14:00 and 14:00:00 as the same time", () => {
    expect(sameClockTime("14:00:00", "14:00")).toBe(true);
    expect(sameClockTime("14:20:00", "14:00")).toBe(false);
    expect(sameClockTime(undefined, "14:00")).toBe(false);
  });
});

describe("special appointment times", () => {
  // 2026-11-26 is a Thursday (day 4).
  const schedule: ScheduleEntry[] = [
    { dayOfWeek: 4, title: "Special Appointment", startTime: "14:00", endTime: "15:00", notes: "" },
    { dayOfWeek: 4, title: "Other", startTime: "09:00", endTime: "10:00", notes: "" },
  ];

  it("offers 20-minute slots inside special-appointment blocks only", () => {
    expect(generateSpecialAppointmentTimes(schedule, "2026-11-26", [])).toEqual([
      "14:00",
      "14:20",
      "14:40",
    ]);
  });

  it("leaves out times that are already booked", () => {
    expect(generateSpecialAppointmentTimes(schedule, "2026-11-26", ["14:20"])).toEqual([
      "14:00",
      "14:40",
    ]);
  });

  it("returns nothing on a day with no schedule", () => {
    expect(generateSpecialAppointmentTimes(schedule, "2026-11-27", [])).toEqual([]);
  });
});
