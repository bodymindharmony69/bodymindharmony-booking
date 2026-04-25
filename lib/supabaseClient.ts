import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function missingSupabasePublicEnv(): string[] {
  const m: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) m.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) m.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return m;
}

/**
 * Browser / public anon client. Client Components only.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  const missing = missingSupabasePublicEnv();
  if (missing.length > 0) {
    throw new Error(`Missing Supabase environment variables: ${missing.join(", ")}`);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  return createClient(url, anon);
}
