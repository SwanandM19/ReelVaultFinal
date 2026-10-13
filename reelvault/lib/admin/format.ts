// Display helpers (pure).

/** Razorpay-style minor units (paise) -> "₹12.50". */
export function formatMoney(minor: number | null | undefined, currency: string | null | undefined = "INR"): string {
  if (minor === null || minor === undefined || !Number.isFinite(minor)) return "—";
  const symbol = currency === "INR" || !currency ? "₹" : `${currency} `;
  return `${symbol}${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Oct 2026" or "12 Oct 2026, 13:44". Always UTC, so the page reads the same wherever the admin is. */
export function formatDate(value: string | null | undefined, withTime = true): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withTime ? `${day}, ${d.toISOString().slice(11, 16)}` : day;
}

/** "FREE_TRIAL" -> "Free trial", "payment_failed" -> "Payment failed". */
export function humanize(value: unknown): string {
  const text = String(value ?? "").replace(/_/g, " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** Push tokens can be used to send notifications to a device, so only the start is displayed. */
export function maskToken(token: string | null | undefined): string {
  if (!token) return "—";
  return token.length <= 26 ? `${token.slice(0, 8)}…` : `${token.slice(0, 22)}…`;
}

/** "3 minutes ago"-style hint for dashboards. */
export function timeAgo(value: string | null | undefined, now: number = Date.now()): string {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
