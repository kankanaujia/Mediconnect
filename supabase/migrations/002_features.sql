-- MediConnect feature migration: password reset, admins, doctor signup and
-- profiles, reviews. Safe to run more than once.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run.
-- Only adds tables and columns; nothing existing is changed or deleted.

-- Password reset links (patients, doctors and admins).
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('patient', 'doctor', 'admin')),
  user_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Admin accounts. Create the first one with scripts/create-admin.mjs.
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

-- Doctor sign-up and public profile details.
alter table public.doctors add column if not exists phone text;
alter table public.doctors add column if not exists qualifications text;
alter table public.doctors add column if not exists experience_years integer;
alter table public.doctors add column if not exists consultation_fee integer;
alter table public.doctors add column if not exists bio text;
alter table public.doctors add column if not exists rejected_at timestamptz;

-- Patient reviews: one per completed booking.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_doctor_id_idx on public.reviews (doctor_id);

-- New tables are server-only: the browser's anon key gets nothing.
alter table public.password_reset_tokens enable row level security;
alter table public.admins                enable row level security;
alter table public.reviews               enable row level security;
revoke all on public.password_reset_tokens from anon, authenticated;
revoke all on public.admins                from anon, authenticated;
revoke all on public.reviews               from anon, authenticated;
