import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate, humanize } from "@/lib/admin/format";
import { safeHref } from "@/lib/admin/safe";

// Small presentational pieces shared by every admin page. Nothing here fetches data.

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-[15px] text-zinc-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Banner({ tone, children }: { tone: "good" | "warn" | "bad"; children: ReactNode }) {
  const cls = tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800";
  return <p role={tone === "good" ? "status" : "alert"} className={`mb-6 rounded-2xl border p-4 text-[15px] ${cls}`}>{children}</p>;
}

export function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {hint ? <p className="text-sm text-zinc-500">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ${className}`}>
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone, href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "warn" | "bad"; href?: string }) {
  const color = tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-zinc-900";
  const body = (
    <>
      <div className="text-sm font-medium text-zinc-500">{label}</div>
      <div className={`mt-2 text-4xl font-bold tabular-nums tracking-tight ${color}`}>{value}</div>
      {hint ? <div className="mt-2 text-sm text-zinc-500">{hint}</div> : null}
    </>
  );
  const cls = "block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm";
  return href ? <Link href={href} className={`${cls} transition-shadow hover:shadow-md`}>{body}</Link> : <div className={cls}>{body}</div>;
}

const TONES: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800", warn: "bg-amber-100 text-amber-800", bad: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800", mute: "bg-zinc-100 text-zinc-600",
};
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  ACTIVE: "good", DONE: "good", captured: "good", RESOLVED: "good", Paid: "good", Live: "good",
  TRIAL: "info", Trial: "info", PROCESSING: "info", IN_PROGRESS: "info", authorized: "info",
  PENDING: "warn", QUEUED: "warn", OPEN: "warn", created: "warn", PAUSED: "warn", refunded: "warn", "Paid (test)": "warn", Test: "warn", Unconfirmed: "warn",
  FAILED: "bad", PAYMENT_FAILED: "bad", failed: "bad", CANCELLED: "bad", Suspended: "bad",
  NEW: "mute", EXPIRED: "mute", None: "mute", FREE_TRIAL: "mute", PREMIUM: "good",
};

export function Badge({ children, tone, raw }: { children: ReactNode; tone?: keyof typeof TONES; raw?: string }) {
  const key = raw ?? (typeof children === "string" ? children : "");
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone ?? STATUS_TONE[key] ?? "mute"]}`}>{children}</span>;
}

/** A status from the database ("PAYMENT_FAILED") shown in plain words ("Payment failed"). */
export const StatusBadge = ({ status }: { status: unknown }) => (status ? <Badge raw={String(status)}>{humanize(status)}</Badge> : <span className="text-zinc-400">—</span>);

export function Bars({ data, order }: { data: Record<string, number>; order?: readonly string[] }) {
  const keys = order ? [...order.filter((k) => k in data), ...Object.keys(data).filter((k) => !order.includes(k))] : Object.keys(data).sort((a, b) => data[b] - data[a]);
  const max = Math.max(1, ...Object.values(data));
  if (!keys.length) return <p className="text-sm text-zinc-400">Nothing yet.</p>;
  return (
    <ul className="space-y-3">
      {keys.map((k) => (
        <li key={k} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-zinc-700" title={humanize(k)}>{humanize(k)}</span>
          <span className="h-2.5 rounded-full bg-zinc-100"><span className="block h-2.5 rounded-full bg-zinc-800" style={{ width: `${(data[k] / max) * 100}%` }} /></span>
          <span className="text-right font-medium tabular-nums text-zinc-800">{data[k]}</span>
        </li>
      ))}
    </ul>
  );
}

export function Kv({ items, columns = 2 }: { items: [string, ReactNode][]; columns?: 1 | 2 }) {
  return (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0 text-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{k}</dt>
          <dd className="mt-0.5 min-w-0 break-words text-zinc-900">{v === null || v === undefined || v === "" ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ExtLink({ href, children }: { href: unknown; children?: ReactNode }) {
  const safe = safeHref(href);
  if (!safe) return <span className="break-all text-zinc-600">{children ?? String(href ?? "—")}</span>;
  return <a href={safe} target="_blank" rel="noreferrer noopener nofollow" className="break-all text-sky-700 underline underline-offset-2">{children ?? safe}</a>;
}

export function Json({ value, max = 4000 }: { value: unknown; max?: number }) {
  const text = JSON.stringify(value, null, 2) ?? "null";
  return <pre className="max-h-80 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">{text.length > max ? `${text.slice(0, max)}\n… (${text.length - max} more characters)` : text}</pre>;
}

/** Renders any stored value sensibly (dates, booleans, arrays, JSON) for the raw table browser. */
export function CellValue({ name, value }: { name: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-zinc-400">—</span>;
  if (typeof value === "boolean") return <Badge tone={value ? "good" : "mute"}>{value ? "yes" : "no"}</Badge>;
  if (typeof value === "number") return <span className="tabular-nums">{value}</span>;
  if (typeof value === "string") {
    if (/(_at|_date)$/.test(name) && !Number.isNaN(Date.parse(value))) return <span className="whitespace-nowrap">{formatDate(value)}</span>;
    if (/^https?:\/\//.test(value)) return <ExtLink href={value}>{value.length > 48 ? `${value.slice(0, 47)}…` : value}</ExtLink>;
    return <span className="break-words">{value.length > 120 ? `${value.slice(0, 119)}…` : value}</span>;
  }
  const json = JSON.stringify(value);
  return <span className="font-mono text-xs text-zinc-600" title={json}>{json.length > 100 ? `${json.slice(0, 99)}…` : json}</span>;
}

// ── Lists: one tidy line per item, the technical detail one click away ─────────
export function List({ children, empty }: { children: ReactNode[] | ReactNode; empty?: string }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (!items.length) return <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-6 text-center text-[15px] text-zinc-500">{empty ?? "Nothing here yet."}</p>;
  return <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">{items}</div>;
}

export function ListRow({ title, subtitle, badges, right, rightHint, details, body, open }: {
  title: ReactNode; subtitle?: ReactNode; badges?: ReactNode; right?: ReactNode; rightHint?: ReactNode;
  /** Label/value pairs shown when the row is opened... */
  details?: [string, ReactNode][];
  /** ...or free-form content (e.g. a message), shown instead. */
  body?: ReactNode;
  open?: boolean;
}) {
  const head = (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words text-[15px] font-semibold text-zinc-900">{title}</span>
          {badges}
        </div>
        {subtitle ? <div className="mt-0.5 break-words text-sm text-zinc-500">{subtitle}</div> : null}
      </div>
      {right !== undefined ? (
        <div className="text-right">
          <div className="text-[15px] font-semibold tabular-nums text-zinc-900">{right}</div>
          {rightHint ? <div className="text-xs text-zinc-500">{rightHint}</div> : null}
        </div>
      ) : null}
    </div>
  );
  if (!details?.length && !body) return <div className="px-5 py-4">{head}</div>;
  return (
    <details className="group" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        {head}
        <span aria-hidden className="shrink-0 text-zinc-400 transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-5">{body ?? <Kv items={details ?? []} />}</div>
    </details>
  );
}

export function Pager({ page, pages, total, path, params, noun = "results" }: { page: number; pages: number; total: number; path: string; params?: Record<string, string | undefined>; noun?: string }) {
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  const btn = "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100";
  const off = "pointer-events-none rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-400";
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
      <span>{total.toLocaleString("en-IN")} {total === 1 ? noun.replace(/s$/, "") : noun}{pages > 1 ? ` · page ${page} of ${pages}` : ""}</span>
      {pages > 1 ? (
        <span className="flex gap-2">
          {page > 1 ? <Link className={btn} href={href(page - 1)}>← Previous</Link> : <span className={off}>← Previous</span>}
          {page < pages ? <Link className={btn} href={href(page + 1)}>Next →</Link> : <span className={off}>Next →</span>}
        </span>
      ) : null}
    </div>
  );
}

/** A plain GET form: filters live in the URL, so every view is linkable and needs no JavaScript. */
export function FilterBar({ action, search, selects }: {
  action: string;
  search?: { name: string; value?: string; placeholder: string };
  /** `defaultLabel` replaces the "<label>: all" first option (e.g. for a sort order, which has no "all"). */
  selects?: { name: string; value?: string; label: string; options: readonly string[]; defaultLabel?: string }[];
}) {
  const field = "rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-[15px]";
  return (
    <form action={action} method="get" className="mb-5 flex flex-wrap items-center gap-2.5">
      {search ? <input name={search.name} defaultValue={search.value} placeholder={search.placeholder} className={`${field} w-full sm:w-72`} autoComplete="off" /> : null}
      {selects?.map((s) => (
        <select key={s.name} name={s.name} defaultValue={s.value ?? ""} className={field} aria-label={s.label}>
          <option value="">{s.defaultLabel ?? `All ${s.label.toLowerCase()}`}</option>
          {s.options.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
        </select>
      ))}
      <button className="rounded-xl bg-zinc-900 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-zinc-700" type="submit">Apply</button>
      <Link href={action} className="px-2 text-[15px] text-zinc-500 underline underline-offset-2">Reset</Link>
    </form>
  );
}

export const UserLink = ({ id, email }: { id: unknown; email?: unknown }) =>
  id ? <Link href={`/admin/users/${String(id)}`} className="text-sky-700 underline underline-offset-2">{String(email || id)}</Link> : <span className="text-zinc-400">—</span>;
