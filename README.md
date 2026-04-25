# BodyMindHarmony Booking System

Vercel-ready Next.js (App Router) booking requests with admin approval and **Google Calendar** on accept.

## Automated checks

```bash
npm test
```

Runs `next build` plus a live **smoke test** against `https://www.bodymindharmony.co.uk` (override with `SMOKE_BASE_URL`). Admin tests use `ADMIN_SECRET` from the environment, **`.env.local`**, or `ADMIN_SECRET.once.txt`.

GitHub Actions runs **`npm ci`**, **`npm audit --audit-level=high`**, and **`npm run build`** on push/PR to `main`. It does not run live smoke tests.

## What it does

- **`/`** — Calendar booking: pick date/time (blocked days disabled), then details → `POST /api/booking-request`.
- **`/book`** — Simple mobile-friendly form → same API.
- **`/admin`** — Toggle blocked dates for the next 30 days (`x-admin-secret`).
- **`/admin/bookings`** — List requests (pending first), **Accept** / **Decline**, Google Calendar setup.

**Accept flow:** validates admin secret → loads pending booking → **creates Google Calendar event** (2h, `primary`, Europe/London) → marks booking **accepted** and inserts **`blocked_dates`** for that day. If Calendar fails, the API returns **500** and the booking stays **pending**.

**Decline:** sets status to `declined` only.

## Supabase SQL (run once in SQL editor)

1. `supabase-blocked-dates.sql` — `blocked_dates` + RLS read for anon.
2. `supabase-booking-requests.sql` — `booking_requests` + RLS insert for anon.

Legacy migrations (only if needed): `supabase-migrate-booking-requests-legacy.sql`, `supabase-reload-postgrest-schema.sql`.

**Inserts and admin actions** use **Postgres** (`POSTGRES_URL` / pooler) so the app does not depend on PostgREST schema cache for writes.

## Vercel environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client + reference) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server; `lib/supabaseAdmin.ts`) |
| `ADMIN_SECRET` | Admin password; sent as header `x-admin-secret` |
| `GOOGLE_CLIENT_ID` | OAuth Web client |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Must match **`https://www.bodymindharmony.co.uk/api/google/callback`** (see `/admin/bookings`) |
| `GOOGLE_REFRESH_TOKEN` | From `/api/google/callback` after sign-in |
| `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` | From Supabase integration (required for DB routes) |

Optional: `POSTGRES_TLS_STRICT=1` (strict TLS; pooler often needs default). Email: `RESEND_API_KEY`, `BOOKING_EMAIL`, `FROM_EMAIL`.

Copy `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` on Vercel if needed:

```bash
npx vercel env pull .env.vercel.production --environment production --yes
node scripts/sync-next-public-supabase-url.mjs
```

## Google Calendar setup (required for Accept)

1. Google Cloud: enable **Calendar API**, OAuth consent, **Web** OAuth client. Authorized redirect URI: **`https://www.bodymindharmony.co.uk/api/google/callback`**.
2. Vercel: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (exact string above). Redeploy.
3. Open **`/admin/bookings`** → **Open Google sign-in** → approve → copy refresh token from callback page → `GOOGLE_REFRESH_TOKEN` in Vercel → redeploy.

## How admin works

- **`/admin`** — Password, then block/unblock dates on the grid.
- **`/admin/bookings`** — Same password (stored in `sessionStorage` as `bodymindharmony_admin_secret`). List bookings; **Accept** needs working Google env above.

## Payment flow

No in-app payment. You confirm manually and send a Stripe link if you use Stripe.
