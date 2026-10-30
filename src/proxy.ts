// Access gate: every route needs a signed-in Supabase user except the login page, auth API and agent API.
// (Next.js 16 renamed middleware.ts to proxy.ts; it runs on the Node.js runtime.)
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession, withRefreshedCookies } from "@/lib/supabase/middleware";

// /api/context authenticates agents with an AGENT_TOKEN_* bearer token, not the user session,
// so it must stay outside the gate — see src/app/api/context/route.ts.
const PUBLIC_PATHS = ["/login", "/auth", "/api/auth", "/api/context"];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// API callers get JSON they can parse; browsers get sent to the login page.
function deny(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fail closed: with no Supabase project configured nobody can sign in, so deny everything
  // except the public paths — /login then renders its "not configured" message.
  if (!isSupabaseConfigured()) {
    return isPublic(pathname) ? NextResponse.next() : deny(request);
  }

  const { user, response } = await updateSession(request);

  // Public paths still refresh the session, but are never redirected away.
  if (isPublic(pathname) || user) return response;

  return withRefreshedCookies(deny(request), response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
