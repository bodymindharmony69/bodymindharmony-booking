import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./requireEnv";

/**
 * Browser / public anon client. Client Components only.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}
