export const bookingAmounts = {
  daily: 30000,
  special: 70000,
} as const;

export function getBookingAmount(kind: "daily" | "special") {
  return bookingAmounts[kind];
}

export const bookingCurrency = "INR";
