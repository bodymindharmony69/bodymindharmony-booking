create table if not exists public.booking_requests (
  id uuid default gen_random_uuid() primary key,
  client_name text not null,
  client_email text,
  client_phone text,
  booking_date date not null,
  booking_time text not null,
  address text,
  message text,
  status text not null default 'pending',
  created_at timestamp default now()
);
alter table public.booking_requests enable row level security;
drop policy if exists "Allow public create booking requests" on public.booking_requests;
drop policy if exists "Allow admin read booking requests" on public.booking_requests;
create policy "Allow public create booking requests"
on public.booking_requests
for insert
to anon, authenticated
with check (true);
-- Admin reads/writes will use service role through API routes, so no public select/update policies needed.
