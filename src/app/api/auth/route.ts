// POST /api/auth { email, password, next } → signs in and sets the Supabase session cookies.
// DELETE /api/auth → signs out.
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Only same-site relative paths, never "//host" or "/\host" open redirects.
// Local on purpose: Next.js type-checks route files and rejects non-handler exports.
function safeNextPath(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown; next?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { email, password } = body;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ ok: false, error: "missing_credentials" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase already rate-limits sign-in attempts; keep its own status where it gives one.
    const status = error.status === 429 ? 429 : 401;
    return NextResponse.json(
      { ok: false, error: status === 429 ? "rate_limited" : "invalid_credentials" },
      { status },
    );
  }

  // Cookies were written onto the response by the server client's setAll.
  return NextResponse.json({ ok: true, next: safeNextPath(body.next) });
}

export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
