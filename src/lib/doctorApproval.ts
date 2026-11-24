import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { emailLayout, sendEmail } from "@/lib/email";

/**
 * Approves or rejects a doctor account and emails the doctor. Pass hospitalId
 * to restrict the change to doctors of that hospital (hospital staff).
 */
export async function reviewDoctor(
  id: string,
  action: "approve" | "reject",
  baseUrl: string,
  hospitalId?: string
) {
  const update =
    action === "approve"
      ? { approved: true, rejected_at: null }
      : { approved: false, rejected_at: new Date().toISOString() };

  let query = supabaseAdmin.from("doctors").update(update).eq("id", id);
  if (hospitalId) query = query.eq("hospital_id", hospitalId);

  const { data, error } = await query.select("id, name, email, approved, rejected_at").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  if (data.email) {
    const approved = action === "approve";
    const { html, text } = emailLayout(
      approved ? "Your doctor account is approved" : "Your doctor application",
      approved
        ? [
            `Hi ${data.name},`,
            "Your MediConnect doctor account has been approved. You can now log in and see your schedule and appointments.",
          ]
        : [
            `Hi ${data.name},`,
            "Your MediConnect doctor account was not approved. Please contact the hospital if you think this is a mistake.",
          ],
      approved ? { label: "Log in", url: `${baseUrl}/Doctor_login` } : undefined
    );
    await sendEmail({
      to: data.email,
      subject: approved ? "MediConnect: account approved" : "MediConnect: application update",
      html,
      text,
    });
  }

  return { ...data, status: action === "approve" ? "approved" : "rejected" };
}

export function doctorStatus(row: { approved: boolean | null; rejected_at: string | null }) {
  if (row.approved === true) return "approved";
  return row.rejected_at ? "rejected" : "pending";
}
