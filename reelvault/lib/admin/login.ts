import "server-only";
import { isAdminEmail } from "./allowlist";
import { readAdminConfig } from "./config";
import { createLimiter } from "./rate-limit";
import { SESSION_TTL_SECONDS, signSession } from "./session";

const byAddress = createLimiter(10, 15 * 60_000);
const byEmail = createLimiter(5, 15 * 60_000);

const MIN_DURATION_MS = 600; // every attempt takes about this long, so timing reveals nothing

export type LoginResult =
  | { ok: true; token: string; maxAgeSeconds: number }
  | { ok: false; reason: "invalid" | "rate" | "config"; retryAfterSeconds?: number };

/**
 * Checks an email + password with Supabase Auth, then requires the email to be on the admin allowlist. The same
 * generic failure is returned for a wrong password, an unknown user and a user who is not an admin.
 */
export async function attemptLogin(emailRaw: string, password: string, address: string): Promise<LoginResult> {
  const started = Date.now();
  const finish = async <T extends LoginResult>(r: T): Promise<T> => {
    const wait = MIN_DURATION_MS - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return r;
  };

  const cfg = readAdminConfig();
  if (!cfg.ok) return finish({ ok: false, reason: "config" });
  const { config } = cfg;

  const email = emailRaw.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(email) || email.length > 254 || !password || password.length > 256) {
    return finish({ ok: false, reason: "invalid" });
  }

  const a = byAddress.hit(address);
  const e = byEmail.hit(email);
  if (!a.ok || !e.ok) return finish({ ok: false, reason: "rate", retryAfterSeconds: Math.max(a.retryAfterSeconds, e.retryAfterSeconds) });

  type TokenUser = { id?: string; email?: string; email_confirmed_at?: string | null };
  let user = null as TokenUser | null;
  try {
    const res = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { apikey: config.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) user = ((await res.json()) as { user?: TokenUser }).user ?? null; // the access/refresh tokens are discarded
  } catch {
    return finish({ ok: false, reason: "invalid" });
  }

  const allowed = !!user?.id && !!user.email_confirmed_at && user.email?.toLowerCase() === email && isAdminEmail(email, config.adminEmails);
  if (!allowed || !user?.id) return finish({ ok: false, reason: "invalid" });

  byEmail.reset(email);
  const now = Math.floor(Date.now() / 1000);
  const token = signSession({ sub: user.id, email, iat: now, exp: now + SESSION_TTL_SECONDS }, config.sessionSecret);
  return finish({ ok: true, token, maxAgeSeconds: SESSION_TTL_SECONDS });
}
