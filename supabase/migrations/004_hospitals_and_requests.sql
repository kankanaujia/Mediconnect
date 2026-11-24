-- MediConnect: hospital accounts and doctor change requests.
-- Run AFTER 003. Runs as one transaction; safe to run again.
-- Adds tables and columns only; existing hospitals stay approved and visible.

-- 1. Hospitals: approval and private contact details.
alter table public.hospitals add column if not exists approved boolean not null default true;
alter table public.hospitals add column if not exists rejected_at timestamptz;
alter table public.hospitals add column if not exists address text;
alter table public.hospitals add column if not exists email text;
alter table public.hospitals add column if not exists registration_number text;

-- 2. Hospital staff logins (one hospital can have several).
create table if not exists public.hospital_users (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  name text not null,
  email text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);
create index if not exists hospital_users_hospital_id_idx on public.hospital_users (hospital_id);

-- 3. Doctor change requests: doctors ask, the hospital (or an admin) approves.
create table if not exists public.doctor_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  hospital_id uuid references public.hospitals(id) on delete set null,
  type text not null check (type in (
    'add_slot', 'update_slot', 'delete_slot', 'add_slots',
    'add_schedule', 'update_schedule', 'delete_schedule', 'add_schedules'
  )),
  payload jsonb not null default '{}'::jsonb,
  summary text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  response_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
create index if not exists doctor_requests_hospital_status_idx on public.doctor_requests (hospital_id, status);
create index if not exists doctor_requests_doctor_idx on public.doctor_requests (doctor_id);

-- 4. Password reset links for hospital staff too.
alter table public.password_reset_tokens drop constraint if exists password_reset_tokens_role_check;
alter table public.password_reset_tokens add constraint password_reset_tokens_role_check
  check (role in ('patient', 'doctor', 'admin', 'hospital'));

-- 5. New tables are server-only.
alter table public.hospital_users  enable row level security;
alter table public.doctor_requests enable row level security;
revoke all on public.hospital_users  from anon, authenticated;
revoke all on public.doctor_requests from anon, authenticated;

-- 6. The public (browser key) sees only approved hospitals, and only public columns.
revoke all on public.hospitals from anon, authenticated;
grant select (id, name, location, phone_number, rating, created_at, approved)
  on public.hospitals to anon, authenticated;
drop policy if exists "public read hospitals" on public.hospitals;
drop policy if exists "public read approved hospitals" on public.hospitals;
create policy "public read approved hospitals"
  on public.hospitals for select
  to anon, authenticated
  using (approved = true);
