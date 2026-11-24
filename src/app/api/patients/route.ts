import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  serializePatientAddress,
  shapePatient,
  type PatientRow,
} from "@/lib/patientProfile";
import { randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/accounts";
import { clearSessionCookie, getSession, setSessionCookie, unauthorized } from "@/lib/session";

// Returns the logged-in patient's own profile.
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "patient") {
      return unauthorized();
    }

    const { data, error } = await supabaseAdmin
      .from("patients")
      .select("*")
      .eq("id", session.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(shapePatient(data as PatientRow), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Sign-up: creates the patient with a hashed password and logs them in.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      email,
      password,
      phone,
      location,
      address,
      consent,
    } = body;

    if (consent !== true) {
      return NextResponse.json(
        { error: "Please read and accept the Privacy Policy to create an account" },
        { status: 400 }
      );
    }

    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanPassword = typeof password === "string" ? password.trim() : "";

    if (!cleanEmail || cleanPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `A valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters are required` },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("patients")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const name = [first_name, last_name].filter(Boolean).join(" ").trim();
    const serializedAddress = serializePatientAddress(address ?? "", {
      location,
      gender,
      date_of_birth,
    });

    const { data, error } = await supabaseAdmin
      .from("patients")
      .insert([
        {
          name,
          email: cleanEmail,
          password: hashPassword(cleanPassword),
          phone,
          address: serializedAddress,
          consent_at: new Date().toISOString(),
        },
      ])
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to insert patient data" },
        { status: 500 }
      );
    }

    return setSessionCookie(
      NextResponse.json(shapePatient(data as PatientRow), { status: 200 }),
      "patient",
      data.id
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Updates the logged-in patient's own profile.
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "patient") {
      return unauthorized();
    }

    const body = await req.json();
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      email,
      phone,
      address,
      location,
    } = body;

    const name = [first_name, last_name].filter(Boolean).join(" ").trim();
    const serializedAddress = serializePatientAddress(address ?? "", {
      location,
      gender,
      date_of_birth,
    });

    const { data, error } = await supabaseAdmin
      .from("patients")
      .update({
        name,
        email,
        phone,
        address: serializedAddress,
      })
      .eq("id", session.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to update patient profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(shapePatient(data as PatientRow), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Deletes the logged-in patient's account: personal details are erased, and
// past visits stay with the hospital without anything that identifies the patient.
// Requires the current password. Upcoming paid appointments must be cancelled first.
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "patient") {
    return unauthorized();
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("id, password")
    .eq("id", session.id)
    .maybeSingle();

  if (!patient || !verifyPassword((password ?? "").trim(), patient.password).ok) {
    return NextResponse.json({ error: "Password is incorrect" }, { status: 403 });
  }

  const { data: upcoming } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("patient_id", session.id)
    .eq("status", "booked")
    .eq("payment_status", "paid");

  if (upcoming && upcoming.length > 0) {
    return NextResponse.json(
      {
        error:
          "You have upcoming paid appointments. Cancel them first (for a refund), then delete your account.",
      },
      { status: 409 }
    );
  }

  // Unpaid upcoming bookings are cancelled so their slots open up again.
  const { data: unpaid } = await supabaseAdmin
    .from("bookings")
    .select("id, slot_id")
    .eq("patient_id", session.id)
    .eq("status", "booked");
  if (unpaid?.length) {
    await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: "patient" })
      .in("id", unpaid.map((b) => b.id));
    const slotIds = unpaid.map((b) => b.slot_id).filter(Boolean);
    if (slotIds.length) {
      await supabaseAdmin.from("slots").update({ is_booked: false }).in("id", slotIds);
    }
  }

  await Promise.all([
    supabaseAdmin.from("bookings").update({ reason: "" }).eq("patient_id", session.id),
    supabaseAdmin.from("reviews").update({ comment: null }).eq("patient_id", session.id),
    supabaseAdmin.from("access_logs").delete().eq("patient_id", session.id),
  ]);

  const { error } = await supabaseAdmin
    .from("patients")
    .update({
      name: "Deleted user",
      email: `deleted-${session.id}@deleted.invalid`,
      phone: null,
      address: null,
      password: hashPassword(randomBytes(24).toString("hex")),
      deleted_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete the account" }, { status: 500 });
  }

  return clearSessionCookie(NextResponse.json({ success: true }));
}

