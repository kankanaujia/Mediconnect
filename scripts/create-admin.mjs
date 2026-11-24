// Creates (or resets the password of) a MediConnect admin account.
//
//   node scripts/create-admin.mjs "Admin Name" admin@example.com
//
// You will be asked for the password, so it never appears in your shell history.
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { randomBytes, scryptSync } from "crypto";
import { readFileSync } from "fs";
import { createInterface } from "readline";
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
  return `scrypt$${salt}$${scryptSync(plain, salt, 64).toString("hex")}`;
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const [name, email] = process.argv.slice(2);
if (!name || !email) {
  console.error('Usage: node scripts/create-admin.mjs "Admin Name" admin@example.com');
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD || (await askHidden("Password (min 8 characters): "));
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const env = { ...loadEnv(".env.local"), ...process.env };
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: existing, error: findError } = await supabase
  .from("admins")
  .select("id")
  .eq("email", email)
  .maybeSingle();

if (findError) {
  console.error(`Could not read admins table: ${findError.message}`);
  console.error("Did you run supabase/migrations/002_features.sql?");
  process.exit(1);
}

const { error } = existing
  ? await supabase.from("admins").update({ name, password: hashPassword(password) }).eq("id", existing.id)
  : await supabase.from("admins").insert({ name, email, password: hashPassword(password) });

if (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}

console.log(existing ? `Updated admin ${email}` : `Created admin ${email}`);
console.log("Log in at /admin/login");
