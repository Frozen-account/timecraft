// Shared Supabase env lookup. Kept separate so the browser, server and proxy clients
// all agree on what "configured" means and none of them throws at module load time.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Placeholders from .env.example must not count as configured.
const isPlaceholder = (v: string) => v.length === 0 || /REPLACE[-_]?ME/i.test(v);

export function isSupabaseConfigured(): boolean {
  return !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_ANON_KEY);
}
