import "server-only";
import type { AccountAction } from "./actions";
import { readBackendConfig } from "./actions";

export type ActionResult = { ok: true; audited: boolean } | { ok: false; error: "noconfig" | "key" | "self" | "missing" | "billing" | "oldbackend" | "failed" };

/**
 * Asks the backend to carry out an account action. The backend does the real work (it also cancels a Razorpay
 * subscription before a deletion) and writes the audit entry; this only forwards the request with the shared secret.
 */
export async function runAccountAction(userId: string, action: AccountAction, actor: string, note?: string): Promise<ActionResult> {
  const cfg = readBackendConfig();
  if (!cfg) return { ok: false, error: "noconfig" };
  let res: Response;
  try {
    res = await fetch(`${cfg.url}/api/admin/users/${encodeURIComponent(userId)}/${action}`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(90_000), // a deletion may wait on Razorpay
      headers: { "Content-Type": "application/json", "X-Admin-Key": cfg.key },
      body: JSON.stringify({ actor, note }),
    });
  } catch {
    return { ok: false, error: "failed" };
  }
  const body = (await res.json().catch(() => ({}))) as { audited?: boolean; code?: string; error?: string };
  if (res.ok) return { ok: true, audited: body.audited !== false };
  if (res.status === 401 || res.status === 503) return { ok: false, error: res.status === 503 ? "noconfig" : "key" };
  if (res.status === 404) {
    // The backend's own "no such user" answer carries an `error` message; a bare 404 means the route doesn't exist there.
    return { ok: false, error: body.error ? "missing" : "oldbackend" };
  }
  if (body.code === "SUBSCRIPTION_CANCEL_FAILED") return { ok: false, error: "billing" };
  if (res.status === 400 && /own account/i.test(body.error ?? "")) return { ok: false, error: "self" };
  return { ok: false, error: "failed" };
}
