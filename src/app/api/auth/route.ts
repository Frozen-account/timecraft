import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE, SESSION_MAX_AGE, checkAccessKey, createSessionToken, isConfigured, safeNextPath,
} from "@/lib/session";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// POST /api/auth { key, next } → sets the session cookie.
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  let body: { key?: unknown; next?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.key !== "string" || !checkAccessKey(body.key)) {
    // Slow down guessing; serverless has no shared state for real rate limiting.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, next: safeNextPath(body.next) });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), { ...cookieOptions, maxAge: SESSION_MAX_AGE });
  return res;
}

// DELETE /api/auth → logout.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
