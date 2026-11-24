// Hashes any passwords still stored as plain text in the patients and doctors
// tables, using the same scrypt format as src/lib/password.ts.
//
//   node scripts/hash-legacy-passwords.mjs          -> dry run, only counts
//   node scripts/hash-legacy-passwords.mjs --apply  -> writes the hashes
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
// Hashing cannot be undone, so run the dry run first.

import { randomBytes, scryptSync } from "crypto";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const apply = process.argv.includes("--apply");
const env = { ...loadEnv(".env.local"), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

for (const table of ["patients", "doctors"]) {
  const { data, error } = await supabase.from(table).select("id, password");
  if (error) {
    console.error(`${table}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  const legacy = data.filter(
    (row) => typeof row.password === "string" && row.password && !row.password.startsWith("scrypt$")
  );
  console.log(`${table}: ${legacy.length} of ${data.length} still plain text`);

  if (!apply) continue;

  let done = 0;
  for (const row of legacy) {
    const { error: updateError } = await supabase
      .from(table)
      .update({ password: hashPassword(row.password) })
      .eq("id", row.id)
      .eq("password", row.password);
    if (updateError) {
      console.error(`  ${table} ${row.id}: ${updateError.message}`);
    } else {
      done += 1;
    }
  }
  console.log(`  hashed ${done}`);
}

if (!apply) {
  console.log("\nDry run only. Re-run with --apply to hash them.");
}
