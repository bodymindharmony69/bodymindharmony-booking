-- Inserts bypass PostgREST table column cache issues after migrations.
-- Callable only by service_role (used by server API).

create or replace function public.insert_booking_request(
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_booking_date date,
  p_booking_time text,
  p_address text,
  p_message text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.booking_requests (
    client_name,
    client_email,
    client_phone,
    booking_date,
    booking_time,
    address,
    message,
    status
  )
  values (
    p_client_name,
    p_client_email,
    p_client_phone,
    p_booking_date,
    p_booking_time,
    p_address,
    p_message,
    'pending'
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.insert_booking_request(text, text, text, date, text, text, text) from public;
grant execute on function public.insert_booking_request(text, text, text, date, text, text, text) to service_role;
