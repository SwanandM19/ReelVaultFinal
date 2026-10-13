// Request helpers for the login / logout endpoints (pure).

/**
 * A form POST is accepted only when the browser says it comes from this same site (blocks cross-site form posts).
 *
 * Browsers label every request with `Sec-Fetch-Site`, which page scripts cannot forge, so that is trusted when it is
 * present. The `Origin` header is the fallback for older browsers; note it is "null" on a same-site form post when the
 * page's referrer policy is `no-referrer`, which is why the admin pages use `same-origin` instead.
 */
export function isSameOrigin(
  origin: string | null | undefined,
  host: string | null | undefined,
  forwardedHost?: string | null,
  secFetchSite?: string | null,
): boolean {
  if (secFetchSite) return secFetchSite === "same-origin";
  if (!origin || !host) return false;
  try {
    const o = new URL(origin).host.toLowerCase();
    return o === host.toLowerCase() || (!!forwardedHost && o === forwardedHost.toLowerCase());
  } catch {
    return false;
  }
}

/** The caller's address for rate limiting: the first hop of X-Forwarded-For, else a shared bucket. */
export function clientAddress(forwardedFor: string | null | undefined, realIp?: string | null): string {
  const first = (forwardedFor ?? "").split(",")[0].trim();
  return (first || (realIp ?? "").trim() || "unknown").slice(0, 64);
}

/** Cookies are Secure everywhere except local development over plain http. */
export function cookieSecure(host: string | null | undefined, nodeEnv: string | undefined): boolean {
  const h = (host ?? "").toLowerCase();
  const local = h.startsWith("localhost") || h.startsWith("127.0.0.1") || h.startsWith("[::1]");
  return nodeEnv === "production" && !local;
}
