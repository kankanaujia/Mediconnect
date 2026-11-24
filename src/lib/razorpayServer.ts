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
    throw new Error(data.error?.description || "Razorpay refund failed");
  }

  return { refundId: data.id, status: data.status ?? "processed" };
}
