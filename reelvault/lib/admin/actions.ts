// Rules for the dashboard's account actions (suspend / reinstate / delete). Pure, so they can be tested.

export const ACTIONS = ["suspend", "unsuspend", "delete"] as const;
export type AccountAction = (typeof ACTIONS)[number];

export function parseAction(value: unknown): AccountAction | null {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value) ? (value as AccountAction) : null;
}

/** Deleting needs the account's email typed back exactly (any capitals), so a stray click can never delete anyone. */
export function confirmationMatches(typed: unknown, email: string | null | undefined): boolean {
  if (typeof typed !== "string" || !email) return false;
  const t = typed.trim().toLowerCase();
  return t.length > 0 && t === email.trim().toLowerCase();
}

/** An optional reason for the audit log: single line of plain text, at most 300 characters. */
export function cleanNote(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  return text || undefined;
}

export interface BackendConfig {
  url: string;
  key: string;
}

/** Where the backend is and the shared secret for its /api/admin endpoints. Null = account actions are switched off. */
export function readBackendConfig(env: Record<string, string | undefined> = process.env): BackendConfig | null {
  const url = (env.BACKEND_URL ?? "").trim().replace(/\/+$/, "");
  const key = (env.ADMIN_API_KEY ?? "").trim();
  if (!/^https?:\/\//.test(url) || key.length < 24) return null;
  return { url, key };
}

/** The only messages the pages can show for `?done=` and `?error=` (anything else in the URL is ignored). */
export const DONE_MESSAGES: Record<string, string> = {
  suspended: "The account was suspended. The person is signed out and can't sign in until you reinstate it.",
  active: "The account was reinstated. The person can sign in again.",
  deleted: "The account was deleted.",
};

export const ERROR_MESSAGES: Record<string, string> = {
  noconfig: "Account actions are switched off: set BACKEND_URL and ADMIN_API_KEY (the same key as on the backend), then restart.",
  key: "The backend refused the admin key. Check that ADMIN_API_KEY is the same here and on the backend.",
  protected: "That is an admin account, so it can't be changed from the dashboard.",
  self: "You can't do this to your own account.",
  missing: "That account no longer exists.",
  mismatch: "The email you typed didn't match, so nothing was deleted.",
  oldbackend: "The backend doesn't have the admin endpoints yet. Deploy the latest backend (and set ADMIN_API_KEY there), then try again.",
  billing: "The person's subscription couldn't be cancelled, so the account was NOT deleted. Please try again in a moment.",
  failed: "Something went wrong and the action may not have happened. Check the activity log, then try again.",
  bad: "That request wasn't understood.",
};

export const pickMessage = (table: Record<string, string>, key: unknown): string | undefined =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
