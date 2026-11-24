-- MediConnect: patient privacy (consent, access log, account deletion).
-- Run AFTER 004. Runs as one transaction; safe to run again. Adds only.

-- When the patient agreed to the privacy policy, and when they deleted their account.
alter table public.patients add column if not exists consent_at timestamptz;
alter table public.patients add column if not exists deleted_at timestamptz;

-- Every time a doctor, hospital or admin opens a patient's details.
create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  actor_role text not null check (actor_role in ('doctor', 'hospital', 'admin')),
  actor_id text not null,
  actor_name text,
  action text not null,
  booking_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists access_logs_patient_idx on public.access_logs (patient_id, created_at desc);
create index if not exists access_logs_actor_idx on public.access_logs (actor_id, created_at desc);

-- Server-only.
alter table public.access_logs enable row level security;
revoke all on public.access_logs from anon, authenticated;
