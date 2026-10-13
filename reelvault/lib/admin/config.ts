import "server-only";
import { parseAdminEmails } from "./allowlist";
import { MIN_SECRET_LENGTH } from "./session";

export interface AdminConfig {
  supabaseUrl: string;
  serviceKey: string;   // full database access: only ever used in server code, never sent to the browser
  anonKey: string;      // public key, used only to verify an admin's email + password with Supabase Auth
  sessionSecret: string;
  adminEmails: string[];
}

export type AdminConfigResult = { ok: true; config: AdminConfig } | { ok: false; missing: string[] };

/** Reads the settings. Anything missing means the dashboard stays locked (it never falls back to a default). */
export function readAdminConfig(env: NodeJS.ProcessEnv = process.env): AdminConfigResult {
  const missing: string[] = [];
  const url = (env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(url)) missing.push("SUPABASE_URL");
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = (env.SUPABASE_ANON_KEY ?? "").trim();
  if (!anonKey) missing.push("SUPABASE_ANON_KEY");
  const sessionSecret = (env.ADMIN_SESSION_SECRET ?? "").trim();
  if (sessionSecret.length < MIN_SECRET_LENGTH) missing.push(`ADMIN_SESSION_SECRET (at least ${MIN_SECRET_LENGTH} characters)`);
  const adminEmails = parseAdminEmails(env.ADMIN_EMAILS);
  if (adminEmails.length === 0) missing.push("ADMIN_EMAILS");
  if (missing.length) return { ok: false, missing };
  return { ok: true, config: { supabaseUrl: url, serviceKey, anonKey, sessionSecret, adminEmails } };
}
