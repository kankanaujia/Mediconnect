-- Already applied on 2026-11-24. Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Why: the anon key is shipped to every browser, so anyone can use it to query
-- Supabase directly and skip the app's API checks. Right now that exposes the
-- patients, doctors (including passwords), bookings, slots and schedules tables.
--
-- After this, the browser (anon key) can only read hospitals and the public
-- doctor columns the pages need. Everything else goes through the Next.js API
-- routes, which use the service-role key (that key bypasses RLS) and check the
-- login session.

-- 1. Private tables: turn on RLS with no policies, so anon gets nothing.
alter table public.patients         enable row level security;
alter table public.bookings         enable row level security;
alter table public.slots            enable row level security;
alter table public.doctor_schedules enable row level security;

drop policy if exists "anon read patients" on public.patients;
revoke all on public.patients         from anon, authenticated;
revoke all on public.bookings         from anon, authenticated;
revoke all on public.slots            from anon, authenticated;
revoke all on public.doctor_schedules from anon, authenticated;

-- 2. Doctors: readable by anyone, but only the public columns.
--    If a page later needs another column, add it to this grant.
alter table public.doctors enable row level security;
revoke all on public.doctors from anon, authenticated;
-- "approved" is included because the pages filter on it (.eq("approved", true)).
grant select (id, name, specialization, image_url, hospital_id, approved) on public.doctors to anon, authenticated;

drop policy if exists "public read approved doctors" on public.doctors;
create policy "public read approved doctors"
  on public.doctors for select
  to anon, authenticated
  using (approved = true);

-- 3. Hospitals: public read-only.
alter table public.hospitals enable row level security;
revoke insert, update, delete on public.hospitals from anon, authenticated;
grant select on public.hospitals to anon, authenticated;

drop policy if exists "public read hospitals" on public.hospitals;
create policy "public read hospitals"
  on public.hospitals for select
  to anon, authenticated
  using (true);
