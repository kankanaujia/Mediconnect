export type BookingKind = "daily" | "special";
export type BookingStatus = "booked" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type BookingMeta = {
  kind: BookingKind;
  status: BookingStatus;
  slotId?: string;
  paymentStatus?: PaymentStatus;
  paymentOrderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  receiptId?: string;
  cancelledAt?: string;
  cancelledBy?: "patient" | "doctor" | "admin";
  refundId?: string;
  refundStatus?: string;
  notifications?: {
    confirmationSid?: string;
    confirmationStatus?: string;
    lastAttemptAt?: string;
    error?: string | null;
    reminders?: Array<{
      sid: string;
      sendAt: string;
      label: string;
      status?: string;
    }>;
  };
};

export type ParsedBookingReason = {
  reason: string;
  meta: BookingMeta;
};

const META_PREFIX = "__MEDICONNECT_BOOKING_META__";

const bookingStatuses: BookingStatus[] = ["booked", "completed", "cancelled"];
const paymentStatuses: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

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
    cancelledAt: meta.cancelledAt,
    cancelledBy: meta.cancelledBy,
    refundId: meta.refundId,
    refundStatus: meta.refundStatus,
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
        status: bookingStatuses.includes(parsed.status as BookingStatus)
          ? (parsed.status as BookingStatus)
          : "booked",
        slotId: parsed.slotId,
        paymentStatus: paymentStatuses.includes(parsed.paymentStatus as PaymentStatus)
          ? (parsed.paymentStatus as PaymentStatus)
          : "pending",
        paymentOrderId: parsed.paymentOrderId,
        paymentId: parsed.paymentId,
        amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
        currency: optionalString(parsed.currency),
        receiptId: optionalString(parsed.receiptId),
        cancelledAt: optionalString(parsed.cancelledAt),
        cancelledBy:
          parsed.cancelledBy === "patient" ||
          parsed.cancelledBy === "doctor" ||
          parsed.cancelledBy === "admin"
            ? parsed.cancelledBy
            : undefined,
        refundId: optionalString(parsed.refundId),
        refundStatus: optionalString(parsed.refundStatus),
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

// ---------------------------------------------------------------------------
// Column storage (supabase/migrations/003_booking_columns.sql).
// Booking status, payment and notification details live in their own columns.
// Rows written before that migration kept them as JSON inside `reason`; those
// are still read correctly through parseBookingReason.

export type BookingColumns = {
  reason: string;
  status: BookingStatus;
  kind: BookingKind;
  slot_id: string | null;
  payment_status: PaymentStatus;
  payment_order_id: string | null;
  payment_id: string | null;
  amount: number | null;
  currency: string | null;
  receipt_id: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  refund_id: string | null;
  refund_status: string | null;
  notifications: BookingMeta["notifications"] | null;
};

type RowLike = { reason?: string | null } & Partial<Record<keyof BookingColumns, unknown>>;

/** Reads a booking row in either the column format or the old JSON format. */
export function bookingFromRow(row: RowLike): ParsedBookingReason {
  const reasonText = typeof row.reason === "string" ? row.reason : "";

  if (typeof row.kind !== "string" || reasonText.includes(META_PREFIX)) {
    return parseBookingReason(reasonText);
  }

  const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);

  return {
    reason: reasonText.trim(),
    meta: {
      kind: row.kind === "special" ? "special" : "daily",
      status: bookingStatuses.includes(row.status as BookingStatus)
        ? (row.status as BookingStatus)
        : "booked",
      slotId: text(row.slot_id),
      paymentStatus: paymentStatuses.includes(row.payment_status as PaymentStatus)
        ? (row.payment_status as PaymentStatus)
        : "pending",
      paymentOrderId: text(row.payment_order_id),
      paymentId: text(row.payment_id),
      amount: typeof row.amount === "number" ? row.amount : undefined,
      currency: text(row.currency),
      receiptId: text(row.receipt_id),
      cancelledAt: text(row.cancelled_at),
      cancelledBy:
        row.cancelled_by === "patient" || row.cancelled_by === "doctor" || row.cancelled_by === "admin"
          ? row.cancelled_by
          : undefined,
      refundId: text(row.refund_id),
      refundStatus: text(row.refund_status),
      notifications:
        row.notifications && typeof row.notifications === "object"
          ? (row.notifications as BookingMeta["notifications"])
          : undefined,
    },
  };
}

/** Column values to insert or update for a booking. */
export function bookingColumns(reason: string, meta: Partial<BookingMeta> = {}): BookingColumns {
  return {
    reason: reason.trim(),
    status: meta.status ?? "booked",
    kind: meta.kind ?? "daily",
    slot_id: meta.slotId ?? null,
    payment_status: meta.paymentStatus ?? "pending",
    payment_order_id: meta.paymentOrderId ?? null,
    payment_id: meta.paymentId ?? null,
    amount: meta.amount ?? null,
    currency: meta.currency ?? null,
    receipt_id: meta.receiptId ?? null,
    cancelled_at: meta.cancelledAt ?? null,
    cancelled_by: meta.cancelledBy ?? null,
    refund_id: meta.refundId ?? null,
    refund_status: meta.refundStatus ?? null,
    notifications: meta.notifications ?? null,
  };
}

/** Hours before the appointment after which a patient can no longer cancel. */
export const PATIENT_CANCEL_CUTOFF_HOURS = 2;

/** Appointment dates and times are stored as India local time (IST). */
export const APP_UTC_OFFSET = "+05:30";

export function appointmentStart(appointmentDate: string, appointmentTime: string) {
  return new Date(`${appointmentDate}T${appointmentTime.slice(0, 5)}:00${APP_UTC_OFFSET}`);
}
