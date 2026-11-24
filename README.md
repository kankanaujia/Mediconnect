# MediConnect

A web app for booking doctor appointments. Patients find a doctor, book a slot, pay online, get email/SMS confirmations and a PDF receipt, and can cancel for a refund or review the doctor afterwards. Doctors manage their schedule and appointments. Admins approve doctors and oversee hospitals and bookings.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and Supabase (Postgres), with Razorpay for payments, Resend for email and Twilio for SMS.

## Features

**Patients**
- Sign up, log in, reset a forgotten password by email, edit their profile
- Browse all doctors with search, specialty/hospital filters and sorting by rating or experience
- Doctor profile pages with qualifications, fee, bio and patient reviews
- Book a **daily slot** (₹300) the doctor has opened, or a **special appointment** (₹700) at any free time in the doctor's schedule
- Pay through Razorpay, get a confirmation email and SMS, download a PDF receipt
- Reschedule, or cancel up to 2 hours before for a full automatic refund
- Rate and review the doctor after a completed appointment

**Doctors**
- Sign up in the app; the account is activated after an admin approves it
- Edit their public profile (qualifications, experience, fee, photo, bio)
- Set a weekly schedule and create daily slots, one at a time or a week at once
- See appointments as a list or a weekly calendar, mark them completed or cancel them (the patient is refunded)

**Admins** (`/admin`)
- Overview: patients, doctors, bookings, revenue
- Approve or reject doctor sign-ups (the doctor is emailed)
- Add hospitals, see all doctors and all bookings, cancel a booking with refund

## Project layout

```
src/
  app/
    page.tsx                       Landing page
    Doctors/, Doctors/[id]/        Doctor directory and profile pages
    Hospitals/
    Patient_login/, patient_Signup/, patient-dashboard/, book-appointment/
    Doctor_login/, Doctor_signup/, doctor-dashboard/
    admin/, admin/login/
    forgot-password/, reset-password/
    api/
      auth/login, logout, forgot-password, reset-password
      patients                        Sign-up and own profile
      doctors, doctors/[id]           Public directory and profiles
      doctors/register, doctors/me    Doctor sign-up and own profile
      bookings, bookings/[id]/cancel, notify, receipt
      slots, schedules (+ /bulk)
      payments/create-order, payments/verify
      reviews
      admin/stats, admin/doctors, admin/hospitals, admin/bookings
  components/                Landing page sections, auth card, star rating, doctor calendar
  lib/
    session.ts               Signed HttpOnly session cookie and access checks
    password.ts              scrypt password hashing
    bookingMeta.ts           Booking status/payment model and row mapping
    bookingQueries.ts        Loading bookings with patient/doctor/hospital details
    bookingEmails.ts, email.ts      Emails through Resend
    razorpayServer.ts        Refunds
    supabase.ts              Browser client (anon key, public data only)
    supabaseAdmin.ts         Server client (service-role key)
supabase/migrations/         Database changes, run in order
scripts/                     create-admin, hash-legacy-passwords
tests/                       Unit tests (Vitest)
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your own keys:

   | Variable | Where it comes from |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Same page. Server only, never expose it to the browser. |
   | `SESSION_SECRET` | Any long random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay dashboard → API keys (test keys start with `rzp_test_`) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | [resend.com](https://resend.com) → API Keys. Optional: without them emails are printed to the server log. |
   | `APP_URL` | The site's public address, used in email links (e.g. `https://mediconnect.vercel.app`) |
   | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` | Twilio console. Optional: without them no SMS is sent. |

3. Run the database migrations in order, in the Supabase SQL Editor (New query → paste → Run):

   | File | What it does |
   | --- | --- |
   | `supabase/migrations/001_lock_down.sql` | Stops the browser's anon key from reading private tables |
   | `supabase/migrations/002_features.sql` | Password reset, admins, doctor profile fields, reviews |
   | `supabase/migrations/003_booking_columns.sql` | Booking status/payment columns and the no-double-booking rule |

4. Create the first admin account (you will be asked for a password):

   ```bash
   node scripts/create-admin.mjs "Your Name" you@example.com
   ```

5. Start the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

### Demo data

```bash
node scripts/seed-demo-data.mjs           # add demo accounts, doctor profiles, schedules, upcoming slots
node scripts/seed-demo-data.mjs --remove  # undo everything the script added
```

It only fills in what is missing and never overwrites existing data. It creates two demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Patient | `patient@demo.com` | `demo123` |
| Doctor | `doctor@demo.com` | `demo123` |

## Deploying to Vercel

1. Push the project to GitHub and import it at [vercel.com/new](https://vercel.com/new). Framework: Next.js; no build settings to change.
2. In the Vercel project → Settings → Environment Variables, add every variable from `.env.local`. Set `APP_URL` to the Vercel address and use a new `SESSION_SECRET`.
3. Deploy. The migrations only need to be run once per Supabase project.
4. For real emails to any address, verify your domain in Resend and set `EMAIL_FROM` to an address on it. (`onboarding@resend.dev` can only send to your own Resend account email.)

## Rules worth knowing

- Login happens on the server and sets a signed, HttpOnly `mc_session` cookie. Passwords are scrypt-hashed and never sent to the browser. Old plain-text passwords are hashed on next login (or all at once with `node scripts/hash-legacy-passwords.mjs --apply`).
- Every API route checks the session: patients see only their own data, doctors only their own appointments and slots, admins everything.
- Payment status is set only by the server after verifying Razorpay's signature and order.
- Patients can cancel up to 2 hours before an appointment; doctors and admins any time before it is completed. Paid bookings are refunded in full automatically. Appointment times are India time (IST).
- The database allows only one active booking per doctor per time slot.
- **Test mode only:** Razorpay test accounts with unfinished onboarding (KYC) reject refund calls. With `rzp_test_` keys the app then records a *simulated* refund (refund id `demo_rfnd_...`) so the cancel-and-refund flow can be demonstrated. Test payments are never real money, and with live keys a failed refund always stops the cancellation.
- To pay in test mode use Razorpay's test card `4100 2800 0000 1007`, any future expiry, any CVV, then click **Success** on Razorpay's test bank page.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests |
| `npm run lint` | ESLint |
| `node scripts/create-admin.mjs "Name" email` | Create or reset an admin account |
| `node scripts/hash-legacy-passwords.mjs [--apply]` | Hash any remaining plain-text passwords |
| `node scripts/seed-demo-data.mjs [--remove]` | Add or remove demo data |
