import { createClient, SupabaseClient } from "@supabase/supabase-js";

function projectRefFromUrl(urlRaw: string): string | null {
  const u = urlRaw.trim().replace(/\/+$/, "");
  const m = u.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return m ? m[1].toLowerCase() : null;
}

function refFromJwt(jwt: string): string | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payload.length % 4 === 0 ? "" : "=".repeat(4 - (payload.length % 4));
    const json = JSON.parse(Buffer.from(payload + pad, "base64").toString("utf8"));
    return typeof json.ref === "string" ? json.ref.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Public Supabase URL (never use postgres:// DSN here). */
function pickPublicUrl(): string {
  const candidates = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL].filter(
    Boolean,
  ) as string[];

  for (const raw of candidates) {
    const u = raw.trim().replace(/\/+$/, "");
    if (u.startsWith("postgres:") || u.startsWith("postgresql:")) continue;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
  }

  throw new Error(
    "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL (or https SUPABASE_URL from the Vercel integration).",
  );
}

/**
 * Prefer a key whose JWT `ref` matches the URL project ref, so a stale/wrong
 * NEXT_PUBLIC_SUPABASE_ANON_KEY cannot override a correct SUPABASE_ANON_KEY.
 */
function pickAnonKeyForUrl(url: string): string {
  const urlRef = projectRefFromUrl(url);
  const candidates = [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
  ]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k));

  if (candidates.length === 0) {
    throw new Error(
      "Missing Supabase anon/publishable key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.",
    );
  }

  if (urlRef) {
    for (const jwt of candidates) {
      const r = refFromJwt(jwt);
      if (r && r === urlRef) return jwt;
    }
  }

  return candidates[0];
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = pickPublicUrl();
    _client = createClient(url, pickAnonKeyForUrl(url));
  }
  return _client;
}

/** Anon Supabase client (public reads / inserts allowed by RLS). Lazy for `next build`. */
export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const c = getClient();
    const v = Reflect.get(c as unknown as object, prop, receiver);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
