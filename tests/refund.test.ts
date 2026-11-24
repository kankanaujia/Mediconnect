import { afterEach, describe, expect, it, vi } from "vitest";
import { refundPayment } from "@/lib/razorpayServer";

const rejected = () =>
  Promise.resolve(
    new Response(JSON.stringify({ error: { description: "invalid request sent" } }), { status: 400 })
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("refundPayment", () => {
  it("returns Razorpay's refund when it succeeds", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_abc");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(JSON.stringify({ id: "rfnd_1", status: "processed" }), { status: 200 }))
    );
    await expect(refundPayment("pay_1", 70000)).resolves.toEqual({ refundId: "rfnd_1", status: "processed" });
  });

  it("simulates the refund only with test keys when Razorpay rejects it", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_abc");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
    vi.stubGlobal("fetch", rejected);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await refundPayment("pay_1", 70000);
    expect(result.refundId).toMatch(/^demo_rfnd_/);
    expect(result.status).toContain("simulated");
  });

  it("never simulates with live keys: the error is raised", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_live_abc");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
    vi.stubGlobal("fetch", rejected);
    await expect(refundPayment("pay_1", 70000)).rejects.toThrow("invalid request sent");
  });
});
