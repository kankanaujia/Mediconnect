// Fills the database with demo data for presentations. Safe to run again.
//
//   node scripts/seed-demo-data.mjs           -> add demo data
//   node scripts/seed-demo-data.mjs --remove  -> remove everything this script added
//
// What it adds (never overwrites existing values):
//   - Demo accounts: patient@demo.com and doctor@demo.com, password "demo123"
//   - Profile details (qualifications, experience, fee, bio) for doctors that have none
//   - A weekly schedule (Mon-Sat) for doctors without one, so special appointments show times
//   - Daily slots for the next 7 days for doctors without upcoming slots
// Everything it creates is listed in scripts/.demo-seed.json so --remove can undo it.

import { randomBytes, scryptSync, createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const RECORD = "scripts/.demo-seed.json";
const DEMO_PASSWORD = "demo123";

function loadEnv(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = { ...loadEnv(".env.local"), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const record = existsSync(RECORD)
  ? JSON.parse(readFileSync(RECORD, "utf8"))
  : { patients: [], doctors: [], slots: [], schedules: [], profileFilled: [] };
const save = () => writeFileSync(RECORD, JSON.stringify(record, null, 1));

function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(plain, salt, 64).toString("hex")}`;
}

// Stable pseudo-random number per doctor, so re-runs give the same values.
function pick(id, min, max) {
  const n = parseInt(createHash("sha256").update(id).digest("hex").slice(0, 8), 16);
  return min + (n % (max - min + 1));
}

const degree = {
  Cardiology: "MBBS, MD (Medicine), DM (Cardiology)",
  Dermatology: "MBBS, MD (Dermatology)",
  Gastroenterology: "MBBS, MD (Medicine), DM (Gastroenterology)",
  Neurology: "MBBS, MD (Medicine), DM (Neurology)",
  Oncology: "MBBS, MD (Radiotherapy)",
  Orthopedics: "MBBS, MS (Orthopaedics)",
  Pediatrics: "MBBS, MD (Paediatrics)",
  Psychiatry: "MBBS, MD (Psychiatry)",
};
const focus = {
  Cardiology: "heart health, blood pressure and chest pain",
  Dermatology: "skin, hair and allergy conditions",
  Gastroenterology: "stomach, liver and digestive problems",
  Neurology: "headaches, epilepsy and nerve disorders",
  Oncology: "cancer screening and treatment planning",
  Orthopedics: "bone, joint and sports injuries",
  Pediatrics: "the health of babies, children and teenagers",
  Psychiatry: "anxiety, depression and sleep problems",
};

// Today's date in India, as YYYY-MM-DD, plus an offset in days.
function istDate(offsetDays) {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000 + offsetDays * 86400000);
  return now.toISOString().slice(0, 10);
}

async function remove() {
  const del = async (table, ids, label) => {
    if (!ids.length) return;
    const { data, error } = await sb.from(table).delete().in("id", ids).select("id");
    console.log(`${label}: ${error ? "ERROR " + error.message : data.length + " removed"}`);
  };
  if (record.patients.length) {
    await sb.from("bookings").delete().in("patient_id", record.patients);
  }
  if (record.doctors.length) {
    await sb.from("bookings").delete().in("doctor_id", record.doctors);
  }
  await del("slots", record.slots, "slots");
  await del("doctor_schedules", record.schedules, "schedule entries");
  await del("patients", record.patients, "demo patients");
  await del("doctors", record.doctors, "demo doctors");
  for (const id of record.profileFilled) {
    await sb
      .from("doctors")
      .update({ qualifications: null, experience_years: null, consultation_fee: null, bio: null })
      .eq("id", id);
  }
  console.log(`doctor profiles cleared: ${record.profileFilled.length}`);
  writeFileSync(RECORD, JSON.stringify({ patients: [], doctors: [], slots: [], schedules: [], profileFilled: [] }, null, 1));
}

async function seed() {
  const { data: hospitals } = await sb.from("hospitals").select("id, name").order("name");

  // 1. Demo accounts
  const { data: existingPatient } = await sb.from("patients").select("id").eq("email", "patient@demo.com").maybeSingle();
  if (!existingPatient) {
    const { data, error } = await sb
      .from("patients")
      .insert({
        name: "Demo Patient",
        email: "patient@demo.com",
        password: hashPassword(DEMO_PASSWORD),
        phone: "",
        address: 'Model Town\n__MEDICONNECT_PATIENT_META__{"location":"Patiala","gender":"Female","date_of_birth":"2001-05-14"}',
      })
      .select("id")
      .single();
    if (error) throw error;
    record.patients.push(data.id);
    console.log("created demo patient patient@demo.com");
  }

  const { data: existingDoctor } = await sb.from("doctors").select("id").eq("email", "doctor@demo.com").maybeSingle();
  if (!existingDoctor) {
    const { data, error } = await sb
      .from("doctors")
      .insert({
        name: "Dr. Demo Doctor",
        email: "doctor@demo.com",
        password: hashPassword(DEMO_PASSWORD),
        specialization: "Cardiology",
        hospital_id: hospitals[0].id,
        approved: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    record.doctors.push(data.id);
    console.log("created demo doctor doctor@demo.com");
  }
  save();

  // 2. Profile details for doctors that have none
  const { data: doctors } = await sb
    .from("doctors")
    .select("id, name, specialization, qualifications, experience_years, consultation_fee, bio")
    .eq("approved", true);

  let filled = 0;
  for (const d of doctors) {
    const update = {};
    if (!d.qualifications) update.qualifications = degree[d.specialization] ?? "MBBS";
    if (d.experience_years === null) update.experience_years = pick(d.id, 4, 22);
    if (d.consultation_fee === null) update.consultation_fee = pick(d.id + "fee", 4, 9) * 100;
    if (!d.bio) {
      const years = update.experience_years ?? d.experience_years;
      update.bio = `${d.name} is a ${d.specialization.toLowerCase()} specialist with ${years} years of experience, focusing on ${focus[d.specialization] ?? "patient care"}. Known for clear explanations and unhurried consultations.`;
    }
    if (Object.keys(update).length) {
      await sb.from("doctors").update(update).eq("id", d.id);
      if (!record.profileFilled.includes(d.id)) record.profileFilled.push(d.id);
      filled++;
    }
  }
  save();
  console.log(`doctor profiles filled: ${filled}`);

  // 3. Weekly schedule (Mon-Sat) for doctors without one
  const { data: schedules } = await sb.from("doctor_schedules").select("doctor_id");
  const hasSchedule = new Set(schedules.map((s) => s.doctor_id));
  const scheduleRows = [];
  for (const d of doctors) {
    if (hasSchedule.has(d.id)) continue;
    for (let day = 1; day <= 6; day++) {
      scheduleRows.push(
        { doctor_id: d.id, day_of_week: day, title: "Daily Slot 1", start_time: "10:00", end_time: "11:00", notes: "OPD" },
        { doctor_id: d.id, day_of_week: day, title: "Daily Slot 2", start_time: "11:00", end_time: "12:00", notes: "OPD" },
        { doctor_id: d.id, day_of_week: day, title: "Special Appointment", start_time: "16:00", end_time: "18:00", notes: "Special appointments" }
      );
    }
  }
  for (let i = 0; i < scheduleRows.length; i += 200) {
    const { data, error } = await sb.from("doctor_schedules").insert(scheduleRows.slice(i, i + 200)).select("id");
    if (error) throw error;
    record.schedules.push(...data.map((r) => r.id));
    save();
  }
  console.log(`schedule entries added: ${scheduleRows.length}`);

  // 4. Daily slots for the next 7 days (Mon-Sat) for doctors without upcoming slots
  const today = istDate(0);
  const { data: upcoming } = await sb.from("slots").select("doctor_id").gte("date", today);
  const hasUpcoming = new Set(upcoming.map((s) => s.doctor_id));
  const slotRows = [];
  for (const d of doctors) {
    if (hasUpcoming.has(d.id)) continue;
    const room = `OPD Room ${pick(d.id + "room", 1, 12)}`;
    for (let offset = 1; offset <= 7; offset++) {
      const date = istDate(offset);
      if (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) continue; // Sunday
      for (const time of ["10:00:00", "11:00:00"]) {
        slotRows.push({ doctor_id: d.id, date: `${date}T${time}`, duration: 20, location: room, is_booked: false });
      }
    }
  }
  for (let i = 0; i < slotRows.length; i += 200) {
    const { data, error } = await sb.from("slots").insert(slotRows.slice(i, i + 200)).select("id");
    if (error) throw error;
    record.slots.push(...data.map((r) => r.id));
    save();
  }
  console.log(`daily slots added: ${slotRows.length}`);
  console.log(`\nDone. Demo logins: patient@demo.com / ${DEMO_PASSWORD} and doctor@demo.com / ${DEMO_PASSWORD}`);
}

if (process.argv.includes("--remove")) {
  await remove();
} else {
  await seed();
}
