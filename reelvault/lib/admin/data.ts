import "server-only";
import { cache } from "react";
import { requireAdmin } from "./auth";
import { readAdminConfig } from "./config";
import { isAdminEmail } from "./allowlist";
import { isUuid, safeSearchTerm } from "./safe";
import {
  countRows, DbError, getAuthUser, getSchema, listAuthUsers, selectAll, selectPage,
  type AuthUser, type Row, type TableSchema,
} from "./supabase";

// Every exported function begins with `await requireAdmin()`: this file is the only way pages read the database, so
// nothing here can run without a valid admin session.

export const PAGE_SIZE = 25;

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pages: number;
}

const paged = <T,>(rows: T[], total: number, page: number, size = PAGE_SIZE): Paged<T> => ({
  rows, total, page, pages: Math.max(1, Math.ceil(total / size)),
});

const sinceDays = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const tally = (rows: Row[], key: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = String(r[key] ?? "unknown");
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
};
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const userName = (u: AuthUser) => String(u.user_metadata?.display_name ?? u.user_metadata?.name ?? u.user_metadata?.full_name ?? "");

/** True while a paid plan still grants access (active, or cancelled but already paid up to a future date). */
export function isPaidActive(sub: Row | undefined, now = Date.now()): boolean {
  if (!sub) return false;
  if (sub.status === "ACTIVE") return true;
  const end = sub.subscription_end_date ? Date.parse(String(sub.subscription_end_date)) : NaN;
  return sub.status === "CANCELLED" && Number.isFinite(end) && end > now;
}
export function isTrialActive(sub: Row | undefined, now = Date.now()): boolean {
  const end = sub?.trial_end_date ? Date.parse(String(sub.trial_end_date)) : NaN;
  return Number.isFinite(end) && end > now && !isPaidActive(sub, now);
}
const netPaid = (p: Row) => (p.status === "captured" || p.status === "refunded" ? Math.max(0, num(p.amount_minor) - num(p.amount_refunded_minor)) : 0);

// ── Shared lookups (once per request) ─────────────────────────────────────────
const authUsers = cache(async () => listAuthUsers());
const emailIndex = cache(async () => new Map((await authUsers()).map((u) => [u.id, u.email ?? ""])));

/** Adds `owner_email` to rows that carry a user_id. */
async function withOwner<T extends Row>(rows: T[]): Promise<(T & { owner_email: string })[]> {
  const emails = await emailIndex();
  return rows.map((r) => ({ ...r, owner_email: emails.get(String(r.user_id)) ?? (r.user_id ? "(deleted user)" : "") }));
}

// ── Overview ──────────────────────────────────────────────────────────────────
export async function getOverview() {
  await requireAdmin();
  const now = Date.now();
  const [users, subs, payments, support, push, prefs, tables, recentPayments, recentSupport] = await Promise.all([
    authUsers(),
    selectAll("subscriptions", { select: "user_id,status,plan,trial_end_date,subscription_end_date,razorpay_mode" }),
    selectAll("payments", { select: "status,method,amount_minor,amount_refunded_minor,livemode,currency,razorpay_created_at" }),
    selectAll("support_queries", { select: "status" }),
    selectAll("push_tokens", { select: "user_id" }),
    selectAll("user_preferences", { select: "faster_search" }),
    getTableList(),
    selectPage("payments", { select: "*", order: "razorpay_created_at.desc.nullslast" }, 1, 6),
    selectPage("support_queries", { select: "*", order: "created_at.desc" }, 1, 6),
  ]);

  const subRows = subs.rows;
  const paidRows = subRows.filter((s) => isPaidActive(s, now));
  const paidActive = paidRows.length;
  const paidActiveTest = paidRows.filter((s) => s.razorpay_mode === "test").length;
  const trialActive = subRows.filter((s) => isTrialActive(s, now)).length;
  const sevenDays = sinceDays(7);
  const net = { live: 0, test: 0 };
  let captured = 0;
  for (const p of payments.rows) {
    const n = netPaid(p);
    if (p.status === "captured" || p.status === "refunded") captured += 1;
    if (p.livemode) net.live += n; else net.test += n;
  }

  return {
    users: {
      total: users.length,
      last7d: users.filter((u) => u.created_at >= sevenDays).length,
      confirmed: users.filter((u) => u.email_confirmed_at).length,
      active7d: users.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= sevenDays).length,
      recent: [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
        .map((u) => ({ id: u.id, email: u.email ?? "", name: userName(u), createdAt: u.created_at })),
    },
    subscriptions: {
      total: subRows.length, byStatus: tally(subRows, "status"), paidActive, paidActiveTest, paidActiveLive: paidActive - paidActiveTest, trialActive,
      noPlanYet: subRows.filter((s) => s.status === "NEW").length,
    },
    payments: {
      total: payments.rows.length, byStatus: tally(payments.rows, "status"), byMethod: tally(payments.rows, "method"),
      captured, netLiveMinor: net.live, netTestMinor: net.test, recent: await withOwner(recentPayments.rows),
    },
    support: { total: support.rows.length, byStatus: tally(support.rows, "status"), recent: recentSupport.rows },
    devices: { tokens: push.rows.length, users: new Set(push.rows.map((r) => r.user_id)).size },
    preferences: { rows: prefs.rows.length, fasterSearchOn: prefs.rows.filter((r) => r.faster_search).length },
    tables: tables.filter((t) => t.name !== AUTH_USERS_TABLE).map(({ name, count }) => ({ name, count })),
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface UserSummary {
  id: string; email: string; name: string; createdAt: string; lastSignIn: string | null; confirmed: boolean; banned: boolean;
  subStatus: string; plan: string; access: "Paid" | "Paid (test)" | "Trial" | "None"; paidMinor: number; support: number; devices: number;
}

const userFacts = cache(async () => {
  const [users, subs, payments, support, push] = await Promise.all([
    authUsers(),
    selectAll("subscriptions", { select: "*" }),
    selectAll("payments", { select: "user_id,status,amount_minor,amount_refunded_minor,livemode" }),
    selectAll("support_queries", { select: "user_id" }),
    selectAll("push_tokens", { select: "user_id" }),
  ]);
  const count = (rows: Row[]) => { const m = new Map<string, number>(); for (const r of rows) m.set(String(r.user_id), (m.get(String(r.user_id)) ?? 0) + 1); return m; };
  const paid = new Map<string, number>();
  for (const p of payments.rows) if (p.livemode) paid.set(String(p.user_id), (paid.get(String(p.user_id)) ?? 0) + netPaid(p));
  return { users, subs: new Map(subs.rows.map((s) => [String(s.user_id), s])), paid, support: count(support.rows), push: count(push.rows) };
});

export type UserSort = "newest" | "active" | "paid";
export const USER_SORTS: readonly UserSort[] = ["newest", "active", "paid"];

export async function getUsers(opts: { page: number; q?: string; sort?: UserSort }): Promise<Paged<UserSummary>> {
  await requireAdmin();
  const f = await userFacts();
  const now = Date.now();
  const q = safeSearchTerm(opts.q).toLowerCase();
  let list: UserSummary[] = f.users.map((u) => {
    const sub = f.subs.get(u.id);
    return {
      id: u.id, email: u.email ?? "", name: userName(u), createdAt: u.created_at, lastSignIn: u.last_sign_in_at,
      confirmed: !!u.email_confirmed_at, banned: !!u.banned_until && Date.parse(u.banned_until) > now,
      subStatus: String(sub?.status ?? "—"), plan: String(sub?.plan ?? "—"),
      // A plan paid for with Razorpay TEST keys grants access but no money was taken, so it is labelled apart.
      access: isPaidActive(sub, now) ? (sub?.razorpay_mode === "test" ? "Paid (test)" : "Paid") : isTrialActive(sub, now) ? "Trial" : "None",
      paidMinor: f.paid.get(u.id) ?? 0, support: f.support.get(u.id) ?? 0, devices: f.push.get(u.id) ?? 0,
    };
  });
  if (q) list = list.filter((u) => `${u.email} ${u.name} ${u.id}`.toLowerCase().includes(q));
  const sorters: Record<UserSort, (a: UserSummary, b: UserSummary) => number> = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    active: (a, b) => (b.lastSignIn ?? "").localeCompare(a.lastSignIn ?? ""),
    paid: (a, b) => b.paidMinor - a.paidMinor,
  };
  list.sort(sorters[opts.sort ?? "newest"]);
  const from = (opts.page - 1) * PAGE_SIZE;
  return paged(list.slice(from, from + PAGE_SIZE), list.length, opts.page);
}

export async function getUserDetail(id: string) {
  await requireAdmin();
  if (!isUuid(id)) return null;
  const [user, subs, prefs, tokens, payments, support] = await Promise.all([
    getAuthUser(id),
    selectAll("subscriptions", { select: "*", filters: { user_id: `eq.${id}` } }),
    selectAll("user_preferences", { select: "*", filters: { user_id: `eq.${id}` } }),
    selectAll("push_tokens", { select: "*", filters: { user_id: `eq.${id}` } }),
    selectAll("payments", { select: "*", filters: { user_id: `eq.${id}` }, order: "razorpay_created_at.desc.nullslast" }, 200),
    selectAll("support_queries", { select: "*", filters: { user_id: `eq.${id}` }, order: "created_at.desc" }, 200),
  ]);
  if (!user && !subs.rows.length && !payments.rows.length && !support.rows.length) return null; // unknown id
  return { user, subscription: subs.rows[0] as Row | undefined, preferences: prefs.rows[0] as Row | undefined, tokens: tokens.rows,
    payments: payments.rows, support: support.rows };
}

// ── Subscriptions, payments, support ─────────────────────────────────────────
export const SUB_STATUSES = ["NEW", "TRIAL", "PENDING", "ACTIVE", "PAYMENT_FAILED", "PAUSED", "CANCELLED", "EXPIRED"] as const;
export async function getSubscriptions(opts: { page: number; status?: string }) {
  await requireAdmin();
  const { rows, total } = await selectPage("subscriptions", { select: "*", filters: opts.status ? { status: `eq.${opts.status}` } : {}, order: "updated_at.desc" }, opts.page, PAGE_SIZE);
  return paged(await withOwner(rows), total, opts.page);
}

export const PAYMENT_STATUSES = ["captured", "authorized", "failed", "refunded", "created"] as const;
export async function getPayments(opts: { page: number; status?: string; mode?: "live" | "test" }) {
  await requireAdmin();
  const filters: Record<string, string> = {};
  if (opts.status) filters.status = `eq.${opts.status}`;
  if (opts.mode) filters.livemode = `eq.${opts.mode === "live"}`;
  const [{ rows, total }, all] = await Promise.all([
    selectPage("payments", { select: "*", filters, order: "razorpay_created_at.desc.nullslast" }, opts.page, PAGE_SIZE),
    selectAll("payments", { select: "status,amount_minor,amount_refunded_minor,fee_minor,tax_minor,livemode", filters }),
  ]);
  const totals = { gross: 0, refunded: 0, fees: 0, tax: 0 };
  for (const p of all.rows) if (p.status === "captured" || p.status === "refunded") {
    totals.gross += num(p.amount_minor); totals.refunded += num(p.amount_refunded_minor); totals.fees += num(p.fee_minor); totals.tax += num(p.tax_minor);
  }
  return { ...paged(await withOwner(rows), total, opts.page), totals };
}

export const SUPPORT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export async function getSupport(opts: { page: number; status?: string }) {
  await requireAdmin();
  const { rows, total } = await selectPage("support_queries", { select: "*", filters: opts.status ? { status: `eq.${opts.status}` } : {}, order: "created_at.desc" }, opts.page, PAGE_SIZE);
  return paged(rows, total, opts.page);
}

// ── Account actions ───────────────────────────────────────────────────────────
/** What the confirmation page and the action handler need to know about the person an action would affect. */
export async function getUserForAction(id: string) {
  await requireAdmin();
  if (!isUuid(id)) return null;
  const user = await getAuthUser(id);
  if (!user) return null;
  const cfg = readAdminConfig();
  return {
    id: user.id, email: user.email ?? "", name: userName(user),
    suspended: !!user.banned_until && Date.parse(user.banned_until) > Date.now(),
    isAdmin: cfg.ok && isAdminEmail(user.email, cfg.config.adminEmails), // admin accounts can't be changed from here
  };
}

/** The audit log: who did what to whose account. `missingTable` is true until account_actions.sql has been run. */
export async function getActionLog(page: number): Promise<Paged<Row & { target_email: string }> & { missingTable: boolean }> {
  await requireAdmin();
  try {
    const { rows, total } = await selectPage("admin_actions", { select: "*", order: "created_at.desc" }, page, PAGE_SIZE);
    const emails = await emailIndex();
    return { ...paged(rows.map((r) => ({ ...r, target_email: emails.get(String(r.target_user_id)) ?? "" })), total, page), missingTable: false };
  } catch (e) {
    if (e instanceof DbError && (e.status === 404 || /PGRST205|schema cache/.test(e.message))) return { ...paged([], 0, page), missingTable: true };
    throw e;
  }
}

// ── Raw database browser ──────────────────────────────────────────────────────
export const AUTH_USERS_TABLE = "auth_users";

/** Sections deliberately left out of the dashboard. They are hidden here too, so the raw browser is not a back door. */
export const HIDDEN_TABLES: ReadonlySet<string> = new Set(["reels", "reel_jobs", "reel_frames"]);

export async function getTableList(): Promise<{ name: string; count: number; columns: TableSchema["columns"] }[]> {
  await requireAdmin();
  const schema = (await getSchema()).filter((t) => !HIDDEN_TABLES.has(t.name));
  const withCounts = await Promise.all(schema.map(async (t) => ({ ...t, count: await countRows(t.name) })));
  const users = await authUsers();
  return [
    { name: AUTH_USERS_TABLE, count: users.length, columns: [
      "id", "email", "phone", "created_at", "last_sign_in_at", "email_confirmed_at", "banned_until", "is_anonymous", "app_metadata", "user_metadata",
    ].map((name) => ({ name, type: "auth" })) },
    ...withCounts,
  ];
}

export const SENSITIVE_COLUMNS = new Set(["token"]);

export async function getTablePage(table: string, page: number): Promise<{ columns: string[]; rows: Row[]; total: number; pages: number } | null> {
  await requireAdmin();
  const known = await getTableList(); // the name from the URL must be a table that really exists
  const meta = known.find((t) => t.name === table);
  if (!meta) return null;

  if (table === AUTH_USERS_TABLE) {
    const users = await authUsers();
    const from = (page - 1) * PAGE_SIZE;
    const rows = users.slice(from, from + PAGE_SIZE).map((u) => ({ ...u }) as unknown as Row);
    return { columns: meta.columns.map((c) => c.name), rows, total: users.length, pages: Math.max(1, Math.ceil(users.length / PAGE_SIZE)) };
  }

  const columns = meta.columns.map((c) => c.name);
  const order = columns.includes("created_at") ? "created_at.desc" : columns.includes("received_at") ? "received_at.desc" : columns.includes("updated_at") ? "updated_at.desc" : undefined;
  const { rows, total } = await selectPage(table, { select: columns.join(","), order }, page, PAGE_SIZE);
  return { columns, rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
