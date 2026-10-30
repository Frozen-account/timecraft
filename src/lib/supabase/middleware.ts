// Session refresh for src/proxy.ts (Next.js 16 renamed middleware.ts to proxy.ts).
// Runs on every matched request: rotates the Supabase access/refresh cookies before they
// expire, so a session stays alive on each device independently and survives restarts.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

export type SessionResult = {
  user: User | null;
  /** Carries any refreshed auth cookies — must be returned, or the rotation is lost. */
  response: NextResponse;
};

export async function updateSession(request: NextRequest): Promise<SessionResult> {
  // Mutated by setAll below: @supabase/ssr hands us new cookies only when it rotates them.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        // Rebuild so downstream handlers read the refreshed cookies, then mirror them to the client.
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates against Supabase; getSession() would trust an unverified cookie.
  const { data } = await supabase.auth.getUser();
  return { user: data.user ?? null, response };
}

// A redirect/JSON response starts with no cookies, so copy over anything updateSession rotated.
// Without this, a request that refreshes its token and then redirects would drop the new token
// and bounce the user to /login on their next navigation.
export function withRefreshedCookies(target: NextResponse, from: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) target.cookies.set(cookie);
  return target;
}
