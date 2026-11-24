-- MediConnect: move booking status, payment and notification details out of
-- the JSON stored inside bookings.reason into real columns, and let the
-- database refuse double bookings. Run AFTER 002_features.sql.
-- Runs as one transaction: if any step fails, nothing is changed.

-- 1. New columns (the existing `status` column is reused).
alter table public.bookings add column if not exists kind             text;
alter table public.bookings add column if not exists slot_id          uuid;
alter table public.bookings add column if not exists payment_status   text;
alter table public.bookings add column if not exists payment_order_id text;
alter table public.bookings add column if not exists payment_id       text;
alter table public.bookings add column if not exists amount           integer;
alter table public.bookings add column if not exists currency         text;
alter table public.bookings add column if not exists receipt_id       text;
alter table public.bookings add column if not exists cancelled_at     timestamptz;
alter table public.bookings add column if not exists cancelled_by     text;
alter table public.bookings add column if not exists refund_id        text;
alter table public.bookings add column if not exists refund_status    text;
alter table public.bookings add column if not exists notifications    jsonb;

-- 2. Remove any old CHECK rule on bookings.status (it may not allow 'cancelled').
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.bookings drop constraint %I', r.conname);
  end loop;
end $$;

-- 3. Copy the JSON details into the columns and keep only the patient's text in reason.
with meta as (
  select
    id,
    trim(substring(reason from 1 for position('__MEDICONNECT_BOOKING_META__' in reason) - 1)) as reason_text,
    substring(reason from position('__MEDICONNECT_BOOKING_META__' in reason)
                         + length('__MEDICONNECT_BOOKING_META__'))::jsonb as m
  from public.bookings
  where position('__MEDICONNECT_BOOKING_META__' in reason) > 0
)
update public.bookings b set
  reason           = meta.reason_text,
  status           = coalesce(nullif(meta.m->>'status', ''), 'booked'),
  kind             = coalesce(nullif(meta.m->>'kind', ''), 'daily'),
  slot_id          = nullif(meta.m->>'slotId', '')::uuid,
  payment_status   = coalesce(nullif(meta.m->>'paymentStatus', ''), 'pending'),
  payment_order_id = nullif(meta.m->>'paymentOrderId', ''),
  payment_id       = nullif(meta.m->>'paymentId', ''),
  amount           = (meta.m->>'amount')::integer,
  currency         = nullif(meta.m->>'currency', ''),
  receipt_id       = nullif(meta.m->>'receiptId', ''),
  cancelled_at     = (meta.m->>'cancelledAt')::timestamptz,
  cancelled_by     = nullif(meta.m->>'cancelledBy', ''),
  refund_id        = nullif(meta.m->>'refundId', ''),
  refund_status    = nullif(meta.m->>'refundStatus', ''),
  notifications    = meta.m->'notifications'
from meta
where b.id = meta.id;

-- Rows that never had JSON details.
update public.bookings set kind = 'daily' where kind is null;
update public.bookings set payment_status = 'pending' where payment_status is null;
update public.bookings set status = 'booked' where status is null;

-- 4. Defaults and allowed values.
alter table public.bookings alter column status set default 'booked';
alter table public.bookings alter column kind set default 'daily';
alter table public.bookings alter column payment_status set default 'pending';
alter table public.bookings alter column status set not null;
alter table public.bookings alter column kind set not null;
alter table public.bookings alter column payment_status set not null;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('booked', 'completed', 'cancelled'));
alter table public.bookings drop constraint if exists bookings_kind_check;
alter table public.bookings add constraint bookings_kind_check
  check (kind in ('daily', 'special'));
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status in ('pending', 'paid', 'failed', 'refunded'));

-- 5. One active booking per doctor per time slot, enforced by the database.
create unique index if not exists bookings_one_active_per_slot
  on public.bookings (doctor_id, appointment_date, appointment_time)
  where status = 'booked';

create index if not exists bookings_patient_id_idx on public.bookings (patient_id);
create index if not exists bookings_doctor_date_idx on public.bookings (doctor_id, appointment_date);
