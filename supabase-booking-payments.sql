alter table public.booking_requests
  add column if not exists final_price numeric(10,2),
  add column if not exists payment_url text,
  add column if not exists payment_status text default 'pending';
