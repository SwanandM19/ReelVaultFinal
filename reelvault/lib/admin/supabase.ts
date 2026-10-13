import "server-only";
import { readAdminConfig, type AdminConfig } from "./config";
import { buildQuery, parseContentRange, type QuerySpec } from "./postgrest";

export type Row = Record<string, unknown>;

export class DbError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function config(): AdminConfig {
  const r = readAdminConfig();
  if (!r.ok) throw new DbError("Admin dashboard is not configured", 503);
  return r.config;
}

async function call(path: string, init: { method?: string; headers?: Record<string, string> } = {}): Promise<Response> {
  const c = config();
  let res: Response;
  try {
    res = await fetch(`${c.supabaseUrl}${path}`, {
      method: init.method ?? "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, ...init.headers },
    });
  } catch {
    throw new DbError("Could not reach Supabase", 502);
  }
  if (!res.ok) {
    // PostgREST error bodies describe the problem; they never contain the key.
    const text = await res.text().catch(() => "");
    throw new DbError(`Supabase answered ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`, res.status);
  }
  return res;
}

/** One page of a table, plus the exact total. */
export async function selectPage<T = Row>(table: string, spec: QuerySpec, page: number, pageSize: number): Promise<{ rows: T[]; total: number }> {
  const from = (page - 1) * pageSize;
  const res = await call(`/rest/v1/${encodeURIComponent(table)}?${buildQuery(spec)}`, {
    headers: { Prefer: "count=exact", "Range-Unit": "items", Range: `${from}-${from + pageSize - 1}` },
  });
  const { total } = parseContentRange(res.headers.get("content-range"));
  const rows = (await res.json()) as T[];
  return { rows, total: total ?? from + rows.length };
}

/** Up to `max` rows of selected columns (for totals and breakdowns). `truncated` is true when there were more. */
export async function selectAll<T = Row>(table: string, spec: QuerySpec, max = 10_000): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; from < max; from += size) {
    const res = await call(`/rest/v1/${encodeURIComponent(table)}?${buildQuery(spec)}`, {
      headers: { Prefer: "count=exact", "Range-Unit": "items", Range: `${from}-${Math.min(from + size, max) - 1}` },
    });
    const chunk = (await res.json()) as T[];
    rows.push(...chunk);
    const { total } = parseContentRange(res.headers.get("content-range"));
    if (chunk.length < size || (total !== null && rows.length >= total)) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export async function countRows(table: string, filters: Record<string, string> = {}): Promise<number> {
  const res = await call(`/rest/v1/${encodeURIComponent(table)}?${buildQuery({ select: "*", filters })}`, {
    method: "HEAD",
    headers: { Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" },
  });
  return parseContentRange(res.headers.get("content-range")).total ?? 0;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  is_anonymous: boolean;
  app_metadata: Row;
  user_metadata: Row;
}

/** Supabase Auth users (the admin API never returns passwords or hashes). */
export async function listAuthUsers(max = 5000): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  const perPage = 200;
  for (let page = 1; users.length < max; page++) {
    const res = await call(`/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
    const body = (await res.json()) as { users?: AuthUser[] };
    const chunk = body.users ?? [];
    users.push(...chunk);
    if (chunk.length < perPage) break;
  }
  return users;
}

export async function getAuthUser(id: string): Promise<AuthUser | null> {
  try {
    return (await (await call(`/auth/v1/admin/users/${encodeURIComponent(id)}`)).json()) as AuthUser;
  } catch (e) {
    if (e instanceof DbError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

export interface TableSchema {
  name: string;
  columns: { name: string; type: string }[];
}

/** Every table the database exposes, read from Supabase itself, so new tables show up without code changes. */
export async function getSchema(): Promise<TableSchema[]> {
  const spec = (await (await call("/rest/v1/")).json()) as { definitions?: Record<string, { properties?: Record<string, { format?: string; type?: string }> }> };
  return Object.entries(spec.definitions ?? {})
    .map(([name, def]) => ({
      name,
      columns: Object.entries(def.properties ?? {}).map(([col, p]) => ({ name: col, type: p.format ?? p.type ?? "unknown" })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
