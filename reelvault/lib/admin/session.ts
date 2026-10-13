// Signed, short-lived admin session (stateless cookie value). Pure: Node crypto only, so it can be unit-tested.
import { createHmac, timingSafeEqual } from "node:crypto";

export interface AdminSession {
  sub: string;   // Supabase user id of the admin
  email: string; // lower-cased
  iat: number;   // seconds since epoch
  exp: number;
}

export const MIN_SECRET_LENGTH = 32;
export const SESSION_TTL_SECONDS = 4 * 60 * 60;

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest();

export function signSession(session: AdminSession, secret: string): string {
  if (secret.length < MIN_SECRET_LENGTH) throw new Error("ADMIN_SESSION_SECRET is too short");
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body, secret).toString("base64url")}`;
}

/** Returns the session only if the signature is genuine and it has not expired; otherwise null (never throws). */
export function verifySession(
  token: string | undefined | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): AdminSession | null {
  if (!token || typeof token !== "string" || secret.length < MIN_SECRET_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [body, signature] = parts;

  const expected = sign(body, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const ok =
      typeof s?.sub === "string" && typeof s?.email === "string" &&
      Number.isFinite(s?.iat) && Number.isFinite(s?.exp);
    if (!ok || s.exp <= nowSeconds || s.iat > nowSeconds + 60) return null;
    return { sub: s.sub, email: s.email, iat: s.iat, exp: s.exp };
  } catch {
    return null;
  }
}
