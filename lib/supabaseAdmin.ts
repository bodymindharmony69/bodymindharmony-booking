import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function missingSupabaseServiceEnv(): string[] {
  const m: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) m.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) m.push("SUPABASE_SERVICE_ROLE_KEY");
  return m;
}

/**
 * Service-role client (bypasses RLS). Server-only.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const missing = missingSupabaseServiceEnv();
  if (missing.length > 0) {
    throw new Error(`Missing Supabase environment variables: ${missing.join(", ")}`);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
