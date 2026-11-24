import type { ReactNode } from "react";

/** Centered card layout shared by the login, sign-up and password pages. */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-6">
      <div className="w-full max-w-md pt-20 pb-12">
        <h1 className="text-center text-3xl font-bold text-gray-800">{title}</h1>
        {subtitle ? <p className="mt-2 text-center text-gray-500">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 outline-none focus:border-gray-500";
export const labelClass = "mb-2 block text-sm text-gray-600";
export const primaryButtonClass =
  "w-full rounded-lg bg-gray-800 py-3 font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60";
