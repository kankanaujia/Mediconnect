import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  parsePatientAddress,
  serializePatientAddress,
} from "@/lib/patientProfile";

type PatientRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
};

function shapePatient(row: PatientRow) {
  const profile = parsePatientAddress(row.address);
  const nameParts = row.name.split(" ");

  return {
    id: row.id,
    name: row.name,
    first_name: nameParts[0] ?? "",
    last_name: nameParts.slice(1).join(" "),
    email: row.email,
    password: row.password,
    phone: row.phone,
    address: profile.address,
    location: profile.location,
    gender: profile.gender,
    date_of_birth: profile.date_of_birth,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    let query = supabaseAdmin.from("patients").select("*");

    if (id) {
      query = query.eq("id", id);
    } else if (email) {
      query = query.eq("email", email);
    } else {
      return NextResponse.json(
        { error: "Patient id or email is required" },
        { status: 400 }
      );
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(shapePatient(data as PatientRow), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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

    const name = [first_name, last_name].filter(Boolean).join(" ").trim();
    const serializedAddress = serializePatientAddress(address, {
      location,
      gender,
      date_of_birth,
    });

    const { data, error } = await supabaseAdmin
      .from("patients")
      .insert([
        {
          name,
          email,
          password,
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

    return NextResponse.json(shapePatient(data as PatientRow), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      email,
      phone,
      address,
      location,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Patient id is required" },
        { status: 400 }
      );
    }

    const name = [first_name, last_name].filter(Boolean).join(" ").trim();
    const serializedAddress = serializePatientAddress(address, {
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
      .eq("id", id)
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
