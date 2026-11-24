// Prices in paise (Razorpay's unit). Daily slots have one standard price; a
// special appointment costs the doctor's own consultation fee when they have
// set one, otherwise the default below.
export const bookingAmounts = {
  daily: 30000,
  special: 70000,
} as const;

export function getBookingAmount(
  kind: "daily" | "special",
  consultationFeeRupees?: number | null
) {
  if (kind === "special" && typeof consultationFeeRupees === "number" && consultationFeeRupees > 0) {
    return Math.round(consultationFeeRupees * 100);
  }
  return bookingAmounts[kind];
}

export const bookingCurrency = "INR";
