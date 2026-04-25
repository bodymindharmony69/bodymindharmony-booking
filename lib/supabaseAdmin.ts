import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./requireEnv";

/**
 * Service-role client (bypasses RLS). Server-only.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
