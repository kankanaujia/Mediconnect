async function loadRazorpayScript() {
  if (window.Razorpay) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function launchRazorpayCheckout(input: {
  bookingId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  onSuccess: (result: { receiptId?: string }) => Promise<void> | void;
}) {
  const scriptLoaded = await loadRazorpayScript();

  if (!scriptLoaded) {
    throw new Error("Unable to load Razorpay checkout.");
  }

  const orderRes = await fetch("/api/payments/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookingId: input.bookingId }),
  });

  const orderData = await orderRes.json();

  if (!orderRes.ok) {
    throw new Error(orderData.error || "Failed to create payment order.");
  }

  await new Promise<void>((resolve, reject) => {
    const razorpay = new window.Razorpay!({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "MediConnect",
      description: "Appointment booking payment",
      order_id: orderData.orderId,
      prefill: {
        name: input.patientName,
        email: input.patientEmail,
        contact: input.patientPhone,
      },
      handler: async (response) => {
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: input.bookingId,
            ...response,
          }),
        });

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok) {
          reject(new Error(verifyData.error || "Payment verification failed."));
          return;
        }

        await input.onSuccess({ receiptId: verifyData.receiptId });
        resolve();
      },
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled.")),
      },
      theme: {
        color: "#111111",
      },
    });

    razorpay.open();
  });
}
