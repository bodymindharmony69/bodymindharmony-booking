import { createClient, SupabaseClient } from "@supabase/supabase-js";

function pickSupabaseHttpUrl(): string | undefined {
  const candidates = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL].filter(
    Boolean,
  ) as string[];

  for (const raw of candidates) {
    const u = raw.trim().replace(/\/+$/, "");
    if (u.startsWith("postgres:") || u.startsWith("postgresql:")) continue;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
  }
  return undefined;
}

function pickServiceRoleKey(): string | undefined {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  return key || undefined;
}

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const supabaseUrl = pickSupabaseHttpUrl();
  const serviceRoleKey = pickServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin env (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  _admin = createClient(supabaseUrl, serviceRoleKey);
  return _admin;
}

/** Service-role client (server writes only). Lazy so `next build` works without secrets. */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const admin = getAdmin();
    const v = Reflect.get(admin as unknown as object, prop, receiver);
    return typeof v === "function" ? v.bind(admin) : v;
  },
});
