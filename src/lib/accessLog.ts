import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Session } from "@/lib/session";

// Records who opened which patient's details, so patients can see it in their
// dashboard. Repeat views by the same person within 30 minutes are recorded once.

const REPEAT_WINDOW_MINUTES = 30;

async function actorName(session: Session) {
  if (session.role === "doctor") {
    const { data } = await supabaseAdmin.from("doctors").select("name").eq("id", session.id).maybeSingle();
    return data?.name ?? "Doctor";
  }
  if (session.role === "hospital") {
    const { data } = await supabaseAdmin
      .from("hospital_users")
      .select("name, hospitals(name)")
      .eq("id", session.id)
      .maybeSingle();
    const hospital = (data?.hospitals as unknown as { name: string } | null)?.name;
    return hospital ? `${data?.name ?? "Staff"} (${hospital})` : data?.name ?? "Hospital staff";
  }
  if (session.role === "admin") {
    return "MediConnect admin";
  }
  return "";
}

/**
 * Logs that `session` viewed details of the given patients. Patients viewing
 * their own data are not logged. Never throws.
 */
export async function logPatientAccess(
  session: Session | null,
  entries: Array<{ patientId: string; bookingId?: string }>,
  action: string
) {
  try {
    if (!session || session.role === "patient" || entries.length === 0) return;

    const unique = new Map(entries.map((e) => [e.patientId, e]));
    const since = new Date(Date.now() - REPEAT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("access_logs")
      .select("patient_id")
      .eq("actor_id", session.id)
      .eq("action", action)
      .gte("created_at", since)
      .in("patient_id", [...unique.keys()]);
    for (const row of recent ?? []) unique.delete(row.patient_id);
    if (unique.size === 0) return;

    const name = await actorName(session);
    await supabaseAdmin.from("access_logs").insert(
      [...unique.values()].map((e) => ({
        patient_id: e.patientId,
        booking_id: e.bookingId ?? null,
        actor_role: session.role,
        actor_id: session.id,
        actor_name: name,
        action,
      }))
    );
  } catch (error) {
    console.error("[access-log] could not record access", error);
  }
}
