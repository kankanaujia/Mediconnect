"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import AuthCard, { inputClass, labelClass, primaryButtonClass } from "@/components/auth/AuthCard";

const MIN_PASSWORD_LENGTH = 8;

const loginPages: Record<string, string> = {
  patient: "/Patient_login",
  doctor: "/Doctor_login",
  admin: "/admin/login",
  hospital: "/hospital/login",
};

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneRole, setDoneRole] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not reset the password.");
      return;
    }
    setDoneRole(data.role ?? "patient");
  };

  if (!token) {
    return (
      <AuthCard title="Reset Password">
        <p className="text-center text-sm text-gray-600">
          This link is missing its reset code.{" "}
          <Link href="/forgot-password" className="text-blue-500 hover:underline">
            Request a new link
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  if (doneRole) {
    return (
      <AuthCard title="Password Updated">
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          Your password has been changed. You can now log in with the new password.
        </div>
        <Link
          href={loginPages[doneRole] ?? "/Patient_login"}
          className={`${primaryButtonClass} mt-6 block text-center`}
        >
          Go to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset Password" subtitle="Choose a new password for your account">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={labelClass}>New password</label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Confirm new password</label>
          <input
            type="password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600">
            {error}{" "}
            {error.includes("expired") || error.includes("used") ? (
              <Link href="/forgot-password" className="text-blue-500 hover:underline">
                Request a new link
              </Link>
            ) : null}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Saving..." : "Set new password"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
