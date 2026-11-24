-- MediConnect: prescriptions and doctor leave. Run AFTER 006. Safe to run again.

-- 1. One prescription per appointment, written by the doctor.
create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  diagnosis text,
  medicines jsonb not null default '[]'::jsonb,
  advice text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prescriptions_patient_idx on public.prescriptions (patient_id);

-- 2. Doctor leave days (added through an approved "leave" request).
create table if not exists public.doctor_leaves (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists doctor_leaves_doctor_idx on public.doctor_leaves (doctor_id, start_date);

-- 3. Allow "leave" as a doctor request type.
alter table public.doctor_requests drop constraint if exists doctor_requests_type_check;
alter table public.doctor_requests add constraint doctor_requests_type_check check (type in (
  'add_slot', 'update_slot', 'delete_slot', 'add_slots',
  'add_schedule', 'update_schedule', 'delete_schedule', 'add_schedules',
  'leave'
));

-- 4. Server-only.
alter table public.prescriptions enable row level security;
alter table public.doctor_leaves enable row level security;
revoke all on public.prescriptions from anon, authenticated;
revoke all on public.doctor_leaves from anon, authenticated;
