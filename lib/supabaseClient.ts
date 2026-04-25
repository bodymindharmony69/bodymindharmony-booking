import { createClient, SupabaseClient } from "@supabase/supabase-js";

function pickUrl(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") ?? "";
  if (!u) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  return u;
}

function pickAnon(): string {
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!k) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return k;
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) _client = createClient(pickUrl(), pickAnon());
  return _client;
}

/** Anon Supabase client (public reads). Lazy so `next build` works without DB env. */
export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const c = getClient();
    const v = Reflect.get(c as unknown as object, prop, receiver);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
