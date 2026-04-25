import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
 * Anon / publishable key. Vercel + Supabase integration often exposes SUPABASE_ANON_KEY
 * without duplicating NEXT_PUBLIC_SUPABASE_ANON_KEY — support both.
 */
function pickAnonKey(): string {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";

  if (!k) {
    throw new Error(
      "Missing Supabase anon/publishable key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.",
    );
  }
  return k;
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) _client = createClient(pickPublicUrl(), pickAnonKey());
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
