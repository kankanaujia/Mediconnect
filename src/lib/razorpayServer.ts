// Server-side calls to the Razorpay REST API.

function getAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

/** Refunds a captured payment in full (or the given amount in paise). */
export async function refundPayment(paymentId: string, amount?: number) {
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(amount ? { amount } : {}),
    }
  );

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    error?: { description?: string };
  };

  if (!response.ok || !data.id) {
    const reason = data.error?.description || "Razorpay refund failed";

    // Demo safety net, TEST KEYS ONLY: Razorpay test accounts whose onboarding
    // (KYC) is not finished reject refund calls with "invalid request sent".
    // Test payments are never real money, so record a simulated refund so the
    // cancel-and-refund flow can still be demonstrated. Live keys never reach
    // this branch: a failed live refund always stops the cancellation.
    if (isTestMode()) {
      console.warn(`[razorpay] test-mode refund rejected (${reason}); recording a simulated refund`);
      return {
        refundId: `demo_rfnd_${Date.now().toString(36)}`,
        status: "simulated (test mode)",
      };
    }

    throw new Error(reason);
  }

  return { refundId: data.id, status: data.status ?? "processed" };
}

/** True when the app is using Razorpay test keys, where no real money moves. */
export function isTestMode() {
  return (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_");
}
