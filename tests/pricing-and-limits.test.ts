import { afterEach, describe, expect, it, vi } from "vitest";
import { getBookingAmount } from "@/lib/paymentConfig";
import { clearRateLimit, hitRateLimit } from "@/lib/rateLimit";

describe("booking price", () => {
  it("charges the doctor's own fee for special appointments", () => {
    expect(getBookingAmount("special", 650)).toBe(65000);
  });

  it("falls back to the default special fee when the doctor has none", () => {
    expect(getBookingAmount("special", null)).toBe(70000);
    expect(getBookingAmount("special", 0)).toBe(70000);
  });

  it("daily slots always cost the standard price", () => {
    expect(getBookingAmount("daily", 900)).toBe(30000);
  });
});

describe("rate limit", () => {
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit, then asks to wait", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(hitRateLimit(key, 3, 60)).toBe(0);
    expect(hitRateLimit(key, 3, 60)).toBeGreaterThan(0);
  });

  it("resets after the window and when cleared", () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 4; i++) hitRateLimit(key, 3, 60);
    vi.advanceTimersByTime(61_000);
    expect(hitRateLimit(key, 3, 60)).toBe(0);

    for (let i = 0; i < 4; i++) hitRateLimit(key, 3, 60);
    clearRateLimit(key);
    expect(hitRateLimit(key, 3, 60)).toBe(0);
  });
});
