import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { emailLayout, sendEmail } from "@/lib/email";
import type { Session } from "@/lib/session";

// Doctors do not change their slots or schedule directly. Each change becomes
// a request that the doctor's hospital (or a MediConnect admin) approves; the
// change is applied only on approval.

export type RequestType =
  | "add_slot"
  | "update_slot"
  | "delete_slot"
  | "add_slots"
  | "add_schedule"
  | "update_schedule"
  | "delete_schedule"
  | "add_schedules";

type SlotInput = { date?: string; duration?: number | string; location?: string };
type ScheduleInput = {
  dayOfWeek?: number | string;
  title?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
};

export type DoctorRequestRow = {
  id: string;
  doctor_id: string;
  hospital_id: string | null;
  type: RequestType;
  payload: Record<string, unknown>;
  summary: string | null;
  status: "pending" | "approved" | "rejected";
  response_note: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function slotText(slot: SlotInput) {
  const when = (slot.date ?? "").replace("T", " ").slice(0, 16);
  return `${when}${slot.location ? `, ${slot.location}` : ""}`;
}

function scheduleText(s: ScheduleInput) {
  return `${DAYS[Number(s.dayOfWeek)] ?? "?"} ${s.startTime ?? ""}-${s.endTime ?? ""} ${s.title ?? ""}`.trim();
}

/** Short human-readable description shown to the hospital. */
export function describeRequest(type: RequestType, payload: Record<string, unknown>) {
  switch (type) {
    case "add_slot":
      return `Add daily slot: ${slotText(payload as SlotInput)}`;
    case "update_slot":
      return `Change slot to: ${slotText(payload as SlotInput)}`;
    case "delete_slot":
      return `Remove slot${payload.label ? `: ${String(payload.label)}` : ""}`;
    case "add_slots":
      return `Add ${(payload.slots as unknown[] | undefined)?.length ?? 0} daily slots`;
    case "add_schedule":
      return `Add to weekly schedule: ${scheduleText(payload as ScheduleInput)}`;
    case "update_schedule":
      return `Change schedule entry to: ${scheduleText(payload as ScheduleInput)}`;
    case "delete_schedule":
      return `Remove schedule entry${payload.label ? `: ${String(payload.label)}` : ""}`;
    case "add_schedules":
      return `Add ${(payload.schedules as unknown[] | undefined)?.length ?? 0} weekly schedule entries`;
  }
}

/** Creates a pending request for the logged-in doctor. */
export async function createDoctorRequest(
  doctorId: string,
  type: RequestType,
  payload: Record<string, unknown>
) {
  const { data: doctor } = await supabaseAdmin
    .from("doctors")
    .select("id, name, hospital_id")
    .eq("id", doctorId)
    .maybeSingle();

  if (!doctor) {
    throw new Error("Doctor not found");
  }

  const summary = describeRequest(type, payload);
  const { data, error } = await supabaseAdmin
    .from("doctor_requests")
    .insert({ doctor_id: doctorId, hospital_id: doctor.hospital_id, type, payload, summary })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create the request");
  }

  // Tell the hospital's staff there is something to review.
  if (doctor.hospital_id) {
    const { data: staff } = await supabaseAdmin
      .from("hospital_users")
      .select("email, name")
      .eq("hospital_id", doctor.hospital_id);
    await Promise.all(
      (staff ?? []).map((member) => {
        const { html, text } = emailLayout("A doctor sent a schedule request", [
          `Hi ${member.name},`,
          `${doctor.name} asked: ${summary}.`,
          "Review it in the Requests tab of your hospital panel.",
        ]);
        return sendEmail({ to: member.email, subject: `Request from ${doctor.name}`, html, text });
      })
    );
  }

  return data as DoctorRequestRow;
}

function toSlotRow(doctorId: string, slot: SlotInput) {
  if (!slot.date) throw new Error("Slot date is missing");
  return {
    doctor_id: doctorId,
    date: slot.date,
    duration: Number(slot.duration) || 20,
    location: (slot.location ?? "").toString().slice(0, 120),
  };
}

function toScheduleRow(doctorId: string, s: ScheduleInput) {
  const day = Number(s.dayOfWeek);
  if (!Number.isInteger(day) || day < 0 || day > 6 || !s.startTime || !s.endTime) {
    throw new Error("Schedule entry is incomplete");
  }
  return {
    doctor_id: doctorId,
    day_of_week: day,
    title: s.title ?? "Other",
    start_time: s.startTime,
    end_time: s.endTime,
    notes: (s.notes ?? "").toString().slice(0, 300),
  };
}

/** Applies an approved request. Always scoped to the request's doctor. */
async function applyRequest(request: DoctorRequestRow) {
  const doctorId = request.doctor_id;
  const p = request.payload;

  switch (request.type) {
    case "add_slot": {
      const { error } = await supabaseAdmin.from("slots").insert(toSlotRow(doctorId, p as SlotInput));
      if (error) throw new Error(error.message);
      return;
    }
    case "add_slots": {
      const rows = ((p.slots as SlotInput[]) ?? []).map((slot) => toSlotRow(doctorId, slot));
      if (rows.length === 0) throw new Error("No slots in the request");
      const { error } = await supabaseAdmin.from("slots").insert(rows);
      if (error) throw new Error(error.message);
      return;
    }
    case "update_slot": {
      const { data, error } = await supabaseAdmin
        .from("slots")
        .update({
          date: (p as SlotInput).date,
          duration: Number((p as SlotInput).duration) || 20,
          location: (p as SlotInput).location ?? "",
        })
        .eq("id", String(p.id))
        .eq("doctor_id", doctorId)
        .eq("is_booked", false)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("The slot no longer exists or is already booked");
      return;
    }
    case "delete_slot": {
      const { data, error } = await supabaseAdmin
        .from("slots")
        .delete()
        .eq("id", String(p.id))
        .eq("doctor_id", doctorId)
        .eq("is_booked", false)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("The slot no longer exists or is already booked");
      return;
    }
    case "add_schedule": {
      const { error } = await supabaseAdmin
        .from("doctor_schedules")
        .insert(toScheduleRow(doctorId, p as ScheduleInput));
      if (error) throw new Error(error.message);
      return;
    }
    case "add_schedules": {
      const rows = ((p.schedules as ScheduleInput[]) ?? []).map((s) => toScheduleRow(doctorId, s));
      if (rows.length === 0) throw new Error("No schedule entries in the request");
      const { error } = await supabaseAdmin.from("doctor_schedules").insert(rows);
      if (error) throw new Error(error.message);
      return;
    }
    case "update_schedule": {
      const row = toScheduleRow(doctorId, p as ScheduleInput);
      const { data, error } = await supabaseAdmin
        .from("doctor_schedules")
        .update(row)
        .eq("id", String(p.id))
        .eq("doctor_id", doctorId)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("The schedule entry no longer exists");
      return;
    }
    case "delete_schedule": {
      const { error } = await supabaseAdmin
        .from("doctor_schedules")
        .delete()
        .eq("id", String(p.id))
        .eq("doctor_id", doctorId);
      if (error) throw new Error(error.message);
      return;
    }
  }
}

/** Who may decide: admins on any request, hospital staff on their hospital's requests. */
export function canDecide(session: Session, request: { hospital_id: string | null }) {
  return (
    session.role === "admin" ||
    (session.role === "hospital" && !!session.hid && request.hospital_id === session.hid)
  );
}

/** Approves (and applies) or rejects a pending request, then tells the doctor. */
export async function decideRequest(
  request: DoctorRequestRow,
  action: "approve" | "reject",
  session: Session,
  note: string
) {
  if (request.status !== "pending") {
    throw new Error(`This request is already ${request.status}`);
  }

  if (action === "approve") {
    await applyRequest(request);
  }

  const { data, error } = await supabaseAdmin
    .from("doctor_requests")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      response_note: note || null,
      decided_at: new Date().toISOString(),
      decided_by: `${session.role}:${session.id}`,
    })
    .eq("id", request.id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not update the request");
  }

  const { data: doctor } = await supabaseAdmin
    .from("doctors")
    .select("name, email")
    .eq("id", request.doctor_id)
    .maybeSingle();
  if (doctor?.email) {
    const approved = action === "approve";
    const { html, text } = emailLayout(
      approved ? "Your request was approved" : "Your request was not approved",
      [
        `Hi ${doctor.name},`,
        `${request.summary ?? "Your schedule change"}: ${approved ? "approved and applied" : "not approved"}.`,
        note ? `Note from the hospital: ${note}` : "",
      ].filter(Boolean)
    );
    await sendEmail({
      to: doctor.email,
      subject: approved ? "Request approved" : "Request not approved",
      html,
      text,
    });
  }

  return data as DoctorRequestRow;
}
