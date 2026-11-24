import Link from "next/link";

export const metadata = { title: "Privacy Policy | MediConnect" };

const sections: { title: string; points: string[] }[] = [
  {
    title: "What we collect",
    points: [
      "Account details: your name, email, phone number, city, address, gender and date of birth.",
      "Appointments: doctor, hospital, date and time, the reason you write, payment and refund status.",
      "Reviews you leave after a visit.",
      "We do not store card or bank details. Payments are handled by Razorpay.",
    ],
  },
  {
    title: "Who can see it",
    points: [
      "Only the doctor you book and that doctor's hospital see your appointment details and contact number.",
      "Other patients and doctors see only that a time slot is taken, never who took it.",
      "MediConnect administrators can see appointments to resolve problems and refunds.",
      "Every time a doctor, hospital or administrator opens your details it is recorded. You can see this list in your dashboard under \"Privacy & my data\".",
    ],
  },
  {
    title: "How we protect it",
    points: [
      "Passwords are stored as one-way hashes; nobody, including us, can read them.",
      "Your data is only reachable through our server after you log in, never directly from the browser.",
      "Messages about your appointments are sent only to your own email and phone.",
    ],
  },
  {
    title: "Your rights",
    points: [
      "Download everything we hold about you from your dashboard (\"Download my data\").",
      "Correct your details any time from your profile.",
      "Delete your account from your dashboard. Your personal details are erased; the hospital keeps a record of past visits without anything that identifies you.",
      "Withdraw consent by deleting your account. You can ask us questions at any time using the contact details below.",
    ],
  },
  {
    title: "Why we use your data",
    points: [
      "To book, confirm, remind you about and manage your appointments, and to process payments and refunds.",
      "We do not sell your data or use it for advertising.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-white px-5 pb-20 pt-28 text-gray-700 md:pt-36">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl font-bold text-gray-900 md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-gray-500">
          How MediConnect handles your personal and health information, in line with India&apos;s Digital
          Personal Data Protection Act, 2023.
        </p>

        {sections.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-gray-900">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-12 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          This policy is part of a student project demo. Contact: kanishkakanaujia29@gmail.com.{" "}
          <Link href="/patient_Signup" className="text-blue-500 hover:underline">
            Back to sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
