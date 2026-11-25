import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/email", () => ({ emailLayout: () => ({ html: "", text: "" }), sendEmail: async () => null }));

import { cleanPrescription } from "@/lib/prescriptions";
import { cleanLeave } from "@/lib/doctorLeave";
import { describeRequest } from "@/lib/doctorRequests";
import { generatePrescriptionPdf } from "@/lib/prescriptionPdf";

describe("prescriptions", () => {
  it("needs some content", () => {
    expect(cleanPrescription({})).toBe("Write a diagnosis, advice or at least one medicine");
  });

  it("drops empty medicine rows and trims", () => {
    const result = cleanPrescription({
      diagnosis: "  Viral fever ",
      medicines: [{ name: "Paracetamol", dosage: "500mg", frequency: "1-0-1", days: "3" }, { name: "  " }],
    });
    expect(result).toMatchObject({ diagnosis: "Viral fever", medicines: [{ name: "Paracetamol" }] });
  });

  it("rejects a bad follow-up date", () => {
    expect(cleanPrescription({ advice: "Rest", follow_up_date: "tomorrow" })).toBe("Follow-up date is not valid");
  });

  it("builds a PDF", () => {
    const pdf = generatePrescriptionPdf({
      patientName: "A (test)",
      doctorName: "Dr. B",
      specialization: "General",
      hospitalName: "H",
      appointmentDate: "2026-12-01",
      diagnosis: "Cold",
      medicines: [{ name: "X", dosage: "", frequency: "", days: "", notes: "" }],
      advice: null,
      followUpDate: null,
      issuedOn: "2026-12-01",
    });
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString()).toContain("A \\(test\\)");
  });
});

describe("doctor leave", () => {
  const today = "2026-12-01";
  it("accepts one day", () => {
    expect(cleanLeave({ startDate: "2026-12-05" }, today)).toEqual({
      startDate: "2026-12-05",
      endDate: "2026-12-05",
      reason: "",
    });
  });
  it("refuses the past and reversed ranges", () => {
    expect(cleanLeave({ startDate: "2026-11-30" }, today)).toBe("Leave cannot start in the past");
    expect(cleanLeave({ startDate: "2026-12-05", endDate: "2026-12-04" }, today)).toBe(
      "End date is before the start date"
    );
  });
  it("caps the length", () => {
    expect(cleanLeave({ startDate: "2026-12-01", endDate: "2027-03-01" }, today)).toMatch(/at most/);
  });
  it("describes the request for the hospital", () => {
    expect(
      describeRequest("leave", { startDate: "2026-12-05", endDate: "2026-12-06", affectedBookings: 2 })
    ).toBe("Leave from 2026-12-05 to 2026-12-06. 2 booked appointments need rescheduling in this period");
  });
});
