import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isAdminEmail } from "./allowlist";
import { readAdminConfig } from "./config";
import { verifySession, type AdminSession } from "./session";

export const SESSION_COOKIE = "rv_admin";
export const ADMIN_BASE = "/admin";

/**
 * The signed-in admin, or null. The email must still be on the allowlist, so removing someone from ADMIN_EMAILS
 * ends their session immediately.
 */
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  // Read the cookies first, always: it makes every caller render per request. (If this returned early when the
  // settings are missing, Next could prerender an admin page at build time.)
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const cfg = readAdminConfig();
  if (!cfg.ok) return null;
  const session = verifySession(token, cfg.config.sessionSecret);
  return session && isAdminEmail(session.email, cfg.config.adminEmails) ? session : null;
});

/**
 * The gate. Every function that reads data calls this first (see data.ts), so no page, layout or future route can
 * reach the database without a valid admin session, whatever the URL.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect(ADMIN_BASE);
  return admin;
}
