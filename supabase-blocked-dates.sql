create table if not exists public.blocked_dates (
  id uuid default gen_random_uuid() primary key,
  date date unique not null,
  created_at timestamp default now()
);
alter table public.blocked_dates enable row level security;
drop policy if exists "Allow public read blocked dates" on public.blocked_dates;
create policy "Allow public read blocked dates"
on public.blocked_dates
for select
to anon, authenticated
using (true);
