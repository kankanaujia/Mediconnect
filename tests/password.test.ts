import { describe, expect, it } from "vitest";
import { hashPassword, isHashedPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("produces a salted scrypt hash that verifies", () => {
    const hash = hashPassword("correct horse");
    expect(isHashedPassword(hash)).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(verifyPassword("correct horse", hash)).toEqual({ ok: true, needsRehash: false });
  });

  it("uses a different salt every time", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("right-password");
    expect(verifyPassword("wrong-password", hash).ok).toBe(false);
  });

  it("accepts a legacy plain-text password and asks for a rehash", () => {
    expect(verifyPassword("old-pass", "old-pass")).toEqual({ ok: true, needsRehash: true });
    expect(verifyPassword("other", "old-pass").ok).toBe(false);
  });

  it("rejects empty or malformed stored values", () => {
    expect(verifyPassword("x", null).ok).toBe(false);
    expect(verifyPassword("x", "").ok).toBe(false);
    expect(verifyPassword("x", "scrypt$onlysalt").ok).toBe(false);
  });
});
