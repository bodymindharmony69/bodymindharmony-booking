import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./requireEnv";

function serviceRoleKey(): string {
  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (legacy) return legacy;
  /** Vercel Supabase integration often exposes this while `vercel env pull` masks the JWT role key. */
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (secret) return secret;
  throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
}

/**
 * Service-role client (bypasses RLS). Server-only.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = serviceRoleKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
