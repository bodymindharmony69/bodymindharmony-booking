-- Applied to production on 2026-07-30. Preserves legacy booking rows.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='selected_date')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='booking_date')
  then alter table public.booking_requests rename column selected_date to booking_date; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='selected_time')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='booking_time')
  then alter table public.booking_requests rename column selected_time to booking_time; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='name')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='client_name')
  then alter table public.booking_requests rename column name to client_name; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='email')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='client_email')
  then alter table public.booking_requests rename column email to client_email; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='phone')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='client_phone')
  then alter table public.booking_requests rename column phone to client_phone; end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='booking_requests' and column_name='booking_date' and data_type in ('text','character varying'))
  then alter table public.booking_requests alter column booking_date type date using nullif(trim(booking_date::text),'')::date; end if;
end $$;

alter table public.booking_requests
  add column if not exists status text,
  add column if not exists final_price numeric(10,2),
  add column if not exists payment_url text,
  add column if not exists payment_status text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists google_event_id text,
  add column if not exists payment_completed_at timestamptz,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists updated_at timestamptz default now();
update public.booking_requests set status='pending' where status is null or trim(status)='';
update public.booking_requests set payment_status='unpaid' where payment_status is null or trim(payment_status)='';
alter table public.booking_requests alter column status set default 'pending';
alter table public.booking_requests alter column status set not null;
alter table public.booking_requests alter column payment_status set default 'unpaid';
create unique index if not exists booking_requests_stripe_session_uidx on public.booking_requests(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create index if not exists booking_requests_status_created_idx on public.booking_requests(status, created_at desc);
create index if not exists booking_requests_booking_date_idx on public.booking_requests(booking_date);

alter table public.booking_requests enable row level security;
drop policy if exists "Allow public create booking requests" on public.booking_requests;
revoke all on table public.booking_requests from anon, authenticated;
alter table public.blocked_dates enable row level security;
drop policy if exists "Allow read" on public.blocked_dates;
drop policy if exists "Anyone can read blocked dates" on public.blocked_dates;
drop policy if exists "Public can read blocked dates" on public.blocked_dates;
create policy "Public can read blocked dates" on public.blocked_dates for select to anon, authenticated using (true);
revoke insert, update, delete on table public.blocked_dates from anon, authenticated;
grant select on table public.blocked_dates to anon, authenticated;

create table if not exists public.booking_rate_limits (
  fingerprint text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.booking_rate_limits enable row level security;
revoke all on table public.booking_rate_limits from anon, authenticated;

create or replace function public.check_booking_rate_limit(p_fingerprint text, p_limit integer default 5, p_window_seconds integer default 900)
returns boolean language plpgsql security definer set search_path=public as $$
declare allowed boolean;
begin
  if p_fingerprint is null or length(p_fingerprint) < 16 or p_limit < 1 or p_window_seconds < 1 then return false; end if;
  insert into public.booking_rate_limits as r (fingerprint, window_started_at, request_count, updated_at)
  values (p_fingerprint, now(), 1, now())
  on conflict (fingerprint) do update set
    window_started_at=case when r.window_started_at <= now()-make_interval(secs=>p_window_seconds) then now() else r.window_started_at end,
    request_count=case when r.window_started_at <= now()-make_interval(secs=>p_window_seconds) then 1 else r.request_count+1 end,
    updated_at=now()
  returning request_count <= p_limit into allowed;
  return coalesce(allowed, false);
end $$;
revoke all on function public.check_booking_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_booking_rate_limit(text, integer, integer) to service_role;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists booking_requests_set_updated_at on public.booking_requests;
create trigger booking_requests_set_updated_at before update on public.booking_requests for each row execute function public.set_updated_at();
