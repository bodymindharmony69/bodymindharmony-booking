# BodyMindHarmony Booking System

This is a simple Vercel-ready booking request system.

## Automated checks

```bash
npm test
```

Runs `next build` plus a live **smoke test** against `https://www.bodymindharmony.co.uk` (override with `SMOKE_BASE_URL`). Admin tests use `ADMIN_SECRET` from the environment, from **`.env.local`** (same as Next), or from a local `ADMIN_SECRET.once.txt` file.

GitHub Actions (`.github/workflows/ci.yml`) runs **`npm ci` + `npm run build`** on every push/PR to `main`. It does **not** run the live smoke test (that would need secrets and writes to your database).

## What it does

- Public booking page
- Customer chooses date and time
- Blocked dates cannot be selected
- Customer fills name, email, phone, address, message
- Booking request is saved in Postgres (`booking_requests` table; host is often Supabase)
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

Add these in Vercel Project Settings > Environment Variables (or use the Supabase integration, which supplies Postgres URLs):

```text
ADMIN_SECRET=your-admin-password
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=or use SUPABASE_SECRET_KEY from the dashboard
POSTGRES_URL and POSTGRES_URL_NON_POOLING (from Vercel Supabase integration — required for booking + admin DB routes)
POSTGRES_TLS_STRICT=optional; set to `1` only if you want strict TLS verification (Supabase pooler usually needs the default relaxed mode)
RESEND_API_KEY=optional
BOOKING_EMAIL=optional
FROM_EMAIL=optional
```

To copy `SUPABASE_URL` into `NEXT_PUBLIC_SUPABASE_URL` on Vercel after pulling env locally:

```bash
npx vercel env pull .env.vercel.production --environment production --yes
node scripts/sync-next-public-supabase-url.mjs
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
