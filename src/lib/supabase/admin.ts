// Service-role Supabase client. Server-only: this key bypasses RLS entirely.
//
// Needed by GET /api/context, which authenticates agents with an AGENT_TOKEN_* bearer token
// and therefore has no user JWT to satisfy the "authenticated" policies with.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, isSupabaseConfigured } from "./config";

/** Null when the project or the service-role key is not configured, so callers can fall back. */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !isSupabaseConfigured()) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
