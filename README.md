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

Run these in the Supabase SQL editor (see `supabase-blocked-dates.sql` and `supabase-booking-requests.sql` in the repo for the full definitions):

- `blocked_dates` — one row per blocked calendar day.
- `booking_requests` — customer requests with `client_name`, `booking_date`, `booking_time`, `status`, etc.

If you created an older table from an earlier README (columns like `selected_date` / `name`), run `supabase-migrate-booking-requests-legacy.sql` once, then in the Supabase dashboard use **Settings → API → Reload schema** so PostgREST picks up column changes.

**Note:** The app writes booking rows and admin booking actions through **Postgres** (`POSTGRES_URL` from the Vercel Supabase integration) so inserts are reliable even when PostgREST’s schema cache lags.

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
