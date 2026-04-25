/**
 * Google OAuth redirect must exactly match an authorized URI in Google Cloud Console.
 * Prefer explicit GOOGLE_REDIRECT_URI; otherwise derive from public site origin.
 */

const CANONICAL_PRODUCTION_ORIGIN = "https://www.bodymindharmony.co.uk";

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

function ensureHttpsOrigin(origin: string): string {
  const t = origin.trim();
  if (!t) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return trimTrailingSlashes(t);
  return trimTrailingSlashes(`https://${t.replace(/^\/+/, "")}`);
}

/** Public site origin (no path), used to build /api/google/callback. */
export function resolvePublicSiteOrigin(): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (fromEnv) return ensureHttpsOrigin(fromEnv);
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return ensureHttpsOrigin(vercel);
  if (process.env.VERCEL_ENV === "production") {
    return CANONICAL_PRODUCTION_ORIGIN;
  }
  return null;
}

export function getGoogleRedirectUri(): string | null {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const origin = resolvePublicSiteOrigin();
  if (!origin) return null;
  return `${origin}/api/google/callback`;
}

export function requireGoogleRedirectUri(): string {
  const u = getGoogleRedirectUri();
  if (!u) {
    throw new Error(
      "Missing GOOGLE_REDIRECT_URI (or set NEXT_PUBLIC_SITE_URL / SITE_URL, or deploy on Vercel with VERCEL_URL / production).",
    );
  }
  return u;
}
