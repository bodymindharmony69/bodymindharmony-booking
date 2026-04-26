alter table public.booking_requests
add column if not exists final_price numeric(10,2);
