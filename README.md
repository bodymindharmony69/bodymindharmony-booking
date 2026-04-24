# BodyMindHarmony Booking System

This is a simple Vercel-ready booking request system.

## What it does

- Public booking page
- Customer chooses date and time
- Blocked dates cannot be selected
- Customer fills name, email, phone, address, message
- Booking request is saved in Supabase
- Optional email notification using Resend
- Admin page where you block/unblock dates

## Pages

- `/` customer booking page
- `/admin` admin page

## Supabase setup

Create two tables in Supabase SQL editor:

```sql
create table blocked_dates (
  date text primary key,
  created_at timestamp with time zone default now()
);

create table booking_requests (
  id uuid primary key default gen_random_uuid(),
  selected_date text not null,
  selected_time text not null,
  name text not null,
  email text not null,
  phone text not null,
  address text not null,
  message text,
  created_at timestamp with time zone default now()
);
```

## Vercel environment variables

Add these in Vercel Project Settings > Environment Variables:

```text
NEXT_PUBLIC_ADMIN_PASSWORD=your-secret-admin-password
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
RESEND_API_KEY=optional-resend-api-key
BOOKING_EMAIL=your-email@example.com
FROM_EMAIL=BodyMindHarmony <onboarding@resend.dev>
```

## How admin works

Go to:

```text
yourwebsite.com/admin
```

Enter your password.

Click dates to block or unblock them.

Customers on your booking page will immediately see blocked dates crossed out.

## Payment flow

No automatic payment.

Customer sends request.
You check distance and availability.
You reply with confirmation and send Stripe payment link manually.
Booking is confirmed only after payment.
