// Defensive helpers for rendering and querying with data that users (or the sites they link) control.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Only http(s) links are ever rendered as links (a saved URL could be `javascript:` or `data:`). */
export function safeHref(url: unknown): string | null {
  if (typeof url !== "string" || url.length > 2048) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Removes the characters that mean something inside a PostgREST filter (`,` `(` `)` `*` `%` `\` `"` `:` `.`), so a search box can't alter the query. */
export function safeSearchTerm(raw: unknown, maxLength = 80): string {
  return String(raw ?? "").replace(/[,()*%\\":.\s]+/g, " ").trim().slice(0, maxLength);
}

/** 1-based page number from a query string, clamped to something sane. */
export function parsePage(raw: unknown): number {
  const n = Number.parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? ""), 10);
  return Number.isFinite(n) && n >= 1 && n <= 100000 ? n : 1;
}

/** One value of a Next.js `searchParams` entry, restricted to an allowed set (anything else becomes undefined). */
export function pickOne<T extends string>(raw: unknown, allowed: readonly T[]): T | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}
