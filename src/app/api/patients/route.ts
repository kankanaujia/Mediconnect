import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  serializePatientAddress,
  shapePatient,
  type PatientRow,
} from "@/lib/patientProfile";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/accounts";
import { getSession, setSessionCookie, unauthorized } from "@/lib/session";

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
    } = body;

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
