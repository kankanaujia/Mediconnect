-- MediConnect: remove leftover "allow everyone to read" policies on hospitals
-- and doctors. Postgres combines read policies with OR, so an old permissive
-- policy made pending (unapproved) hospitals and doctors visible to the public.
-- After this, only the two policies created by MediConnect's migrations remain.
-- Run AFTER 005. Safe to run again.

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('hospitals', 'doctors')
      and policyname not in ('public read approved hospitals', 'public read approved doctors')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;
