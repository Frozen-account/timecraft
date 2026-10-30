// Constant-time comparison for agent bearer tokens (src/app/api/context/route.ts).
// The former single-key session cookie lived here too; user sessions are now Supabase Auth
// (src/lib/supabase/*), so only this token helper remains.
import { createHash, timingSafeEqual } from "node:crypto";

export function safeEqual(a: string, b: string): boolean {
  // Hash both sides so lengths match and the comparison is constant-time.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
