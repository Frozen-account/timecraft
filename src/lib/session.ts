// Signed session cookie for the TimeCraft access gate. Used by src/proxy.ts and /api/auth (both Node.js runtime).
// Token: "<expiresAtMs>.<hmac>" — HMAC key is derived from TIMECRAFT_ACCESS_KEY, so rotating the key logs everyone out.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "timecraft_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days, seconds

function accessKey(): string | null {
  const key = process.env.TIMECRAFT_ACCESS_KEY;
  return key && key.length > 0 ? key : null;
}

export function isConfigured(): boolean {
  return accessKey() !== null;
}

function sign(payload: string, key: string): string {
  const hmacKey = createHash("sha256").update(`timecraft-session:${key}`).digest();
  return createHmac("sha256", hmacKey).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  // Hash both sides so lengths match and the comparison is constant-time.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkAccessKey(input: string): boolean {
  const key = accessKey();
  return key !== null && safeEqual(input, key);
}

export function createSessionToken(now = Date.now()): string {
  const key = accessKey();
  if (!key) throw new Error("TIMECRAFT_ACCESS_KEY is not set");
  const expires = String(now + SESSION_MAX_AGE * 1000);
  return `${expires}.${sign(expires, key)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  const key = accessKey();
  if (!key || !token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(sig, sign(expires, key));
}

// Only same-site relative paths, never "//host" or "/\host" open redirects.
export function safeNextPath(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}
