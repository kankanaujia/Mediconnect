import { describe, expect, it, vi } from "vitest";

// session.ts imports next/headers, which only works inside a request.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const { canAccessBooking, createSessionToken, readSessionToken } = await import("@/lib/session");

describe("session tokens", () => {
  it("round-trips role and id", () => {
    const token = createSessionToken("doctor", "doc-1");
    expect(readSessionToken(token)).toMatchObject({ role: "doctor", id: "doc-1" });
  });

  it("rejects a token whose payload was changed", () => {
    const token = createSessionToken("patient", "pat-1");
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), role: "admin" })
    ).toString("base64url");
    expect(readSessionToken(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects expired, empty and malformed tokens", () => {
    vi.useFakeTimers();
    const token = createSessionToken("patient", "pat-1");
    vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(readSessionToken(token)).toBeNull();
    vi.useRealTimers();

    expect(readSessionToken(undefined)).toBeNull();
    expect(readSessionToken("not-a-token")).toBeNull();
    expect(readSessionToken("a.b")).toBeNull();
  });
});

describe("booking access", () => {
  const booking = { patient_id: "pat-1", doctor_id: "doc-1" };
  const session = (role: "patient" | "doctor" | "admin", id: string) => ({ role, id, exp: 0 });

  it("allows the booking's own patient and doctor, and admins", () => {
    expect(canAccessBooking(session("patient", "pat-1"), booking)).toBe(true);
    expect(canAccessBooking(session("doctor", "doc-1"), booking)).toBe(true);
    expect(canAccessBooking(session("admin", "anyone"), booking)).toBe(true);
  });

  it("blocks other patients and doctors", () => {
    expect(canAccessBooking(session("patient", "pat-2"), booking)).toBe(false);
    expect(canAccessBooking(session("doctor", "doc-2"), booking)).toBe(false);
    // A patient whose id happens to equal the doctor id must not get in.
    expect(canAccessBooking(session("patient", "doc-1"), booking)).toBe(false);
  });
});
