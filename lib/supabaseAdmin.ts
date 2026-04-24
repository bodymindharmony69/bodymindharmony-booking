import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }
  client = createClient(supabaseUrl, serviceRoleKey);
  return client;
}

/** Lazy admin client so `next build` does not require Supabase env at compile time. */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const admin = getSupabaseAdmin();
    const value = Reflect.get(admin as unknown as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(admin);
    }
    return value;
  },
});
