import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${PREFIX}$${salt}$${hash}`;
}

export function isHashedPassword(stored: string | null | undefined) {
  return typeof stored === "string" && stored.startsWith(`${PREFIX}$`);
}

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Checks a password against the stored value. Rows created before hashing was
 * added still hold plain text; those match directly and report needsRehash so
 * the caller can upgrade them to a hash.
 */
export function verifyPassword(plain: string, stored: string | null | undefined) {
  if (!stored) {
    return { ok: false, needsRehash: false };
  }

  if (!isHashedPassword(stored)) {
    const ok = safeEqual(Buffer.from(plain), Buffer.from(stored));
    return { ok, needsRehash: ok };
  }

  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) {
    return { ok: false, needsRehash: false };
  }

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(plain, salt, expected.length);
  return { ok: safeEqual(actual, expected), needsRehash: false };
}
