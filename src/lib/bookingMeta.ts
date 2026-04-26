export type BookingKind = "daily" | "special";
export type BookingStatus = "booked" | "completed";

export type BookingMeta = {
  kind: BookingKind;
  status: BookingStatus;
  slotId?: string;
  paymentStatus?: "pending" | "paid" | "failed";
  paymentOrderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  receiptId?: string;
  notifications?: {
    confirmationSid?: string;
    reminders?: Array<{
      sid: string;
      sendAt: string;
      label: string;
    }>;
  };
};

export type ParsedBookingReason = {
  reason: string;
  meta: BookingMeta;
};

const META_PREFIX = "__MEDICONNECT_BOOKING_META__";

export function serializeBookingReason(
  reason: string,
  meta: Partial<BookingMeta> = {}
) {
  const payload: BookingMeta = {
    kind: meta.kind ?? "daily",
    status: meta.status ?? "booked",
    slotId: meta.slotId,
    paymentStatus: meta.paymentStatus ?? "pending",
    paymentOrderId: meta.paymentOrderId,
    paymentId: meta.paymentId,
    amount: meta.amount,
    currency: meta.currency,
    receiptId: meta.receiptId,
    notifications: meta.notifications,
  };

  return `${reason.trim()}\n${META_PREFIX}${JSON.stringify(payload)}`.trim();
}

export function parseBookingReason(value: string | null | undefined): ParsedBookingReason {
  if (!value) {
    return {
      reason: "",
      meta: { kind: "daily", status: "booked" },
    };
  }

  const index = value.indexOf(META_PREFIX);

  if (index === -1) {
    return {
      reason: value.trim(),
      meta: { kind: "daily", status: "booked" },
    };
  }

  const reason = value.slice(0, index).trim();
  const rawMeta = value.slice(index + META_PREFIX.length).trim();

  try {
    const parsed = JSON.parse(rawMeta) as Partial<BookingMeta>;
    return {
      reason,
      meta: {
        kind: parsed.kind === "special" ? "special" : "daily",
        status: parsed.status === "completed" ? "completed" : "booked",
        slotId: parsed.slotId,
        paymentStatus: parsed.paymentStatus === "paid" ? "paid" : parsed.paymentStatus === "failed" ? "failed" : "pending",
        paymentOrderId: parsed.paymentOrderId,
        paymentId: parsed.paymentId,
        amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
        currency: typeof parsed.currency === "string" ? parsed.currency : undefined,
        receiptId: typeof parsed.receiptId === "string" ? parsed.receiptId : undefined,
        notifications:
          parsed.notifications && typeof parsed.notifications === "object"
            ? parsed.notifications
            : undefined,
      },
    };
  } catch {
    return {
      reason,
      meta: { kind: "daily", status: "booked", paymentStatus: "pending" },
    };
  }
}
