import Link from "next/link";
import { getAdmin } from "@/lib/admin/auth";
import { readAdminConfig } from "@/lib/admin/config";
import { getOverview } from "@/lib/admin/data";
import { formatMoney, timeAgo } from "@/lib/admin/format";
import { Bars, Card, List, ListRow, PageHeader, Section, Stat, UserLink } from "./_ui/kit";
import { PaymentRow, SupportRow } from "./_ui/rows";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const LOGIN_ERRORS: Record<string, string> = {
  invalid: "That email and password were not accepted, or the account is not allowed here.",
  rate: "Too many attempts. Please wait a few minutes and try again.",
  config: "This area is not available right now.",
};

export default async function AdminHome({ searchParams }: Props) {
  const admin = await getAdmin();
  if (!admin) {
    const e = (await searchParams).e;
    const code = typeof e === "string" ? e : undefined;
    // Setup hints (names of missing settings, never values) are only shown in development.
    const cfg = readAdminConfig();
    const hint = !cfg.ok && process.env.NODE_ENV !== "production" ? `Not configured yet. Missing: ${cfg.missing.join(", ")}` : null;
    return (
      <form action="/admin/login" method="post" className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-5 flex items-center gap-2 text-lg font-bold"><span className="inline-block h-6 w-6 rounded-md bg-[#C5FF00]" aria-hidden /> ReelVault <span className="text-xs font-medium text-zinc-400">admin</span></div>
        {code && LOGIN_ERRORS[code] ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{LOGIN_ERRORS[code]}</p> : null}
        {hint ? <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{hint}</p> : null}
        <label className="mb-1 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" maxLength={254} className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" maxLength={256} className="mb-5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <button type="submit" className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700">Sign in</button>
      </form>
    );
  }

  const o = await getOverview();
  const n = (k: string, m: Record<string, number>) => m[k] ?? 0;
  const plural = (c: number, one: string, many = `${one}s`) => `${c} ${c === 1 ? one : many}`;

  // Things worth a look, each linking straight to the filtered list.
  const attention = [
    { c: n("OPEN", o.support.byStatus), text: (c: number) => `${plural(c, "open support request")}`, href: "/admin/support?status=OPEN" },
    { c: n("failed", o.payments.byStatus), text: (c: number) => `${plural(c, "failed payment")}`, href: "/admin/payments?status=failed" },
    { c: n("PAYMENT_FAILED", o.subscriptions.byStatus), text: (c: number) => `${plural(c, "subscription")} with a failed payment`, href: "/admin/subscriptions?status=PAYMENT_FAILED" },
    { c: n("PENDING", o.subscriptions.byStatus), text: (c: number) => `${plural(c, "subscription")} waiting for payment`, href: "/admin/subscriptions?status=PENDING" },
    { c: o.users.total - o.users.confirmed, text: (c: number) => `${plural(c, "user")} who never confirmed their email`, href: "/admin/users" },
  ].filter((a) => a.c > 0);

  return (
    <>
      <PageHeader title="Overview" subtitle="A quick look at how ReelVault is doing right now." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={o.users.total} href="/admin/users" hint={o.users.last7d ? `${o.users.last7d} new this week` : "none new this week"} />
        <Stat label="Paid plans" value={o.subscriptions.paidActive} tone="good" href="/admin/subscriptions"
          hint={o.subscriptions.paidActiveTest ? `${o.subscriptions.paidActiveLive} live, ${o.subscriptions.paidActiveTest} from test mode` : "all live"} />
        <Stat label="Revenue" value={formatMoney(o.payments.netLiveMinor)} tone="good" href="/admin/payments"
          hint={o.payments.netTestMinor ? `plus ${formatMoney(o.payments.netTestMinor)} in test mode` : "live payments, after refunds"} />
        <Stat label="Support" value={n("OPEN", o.support.byStatus)} tone={n("OPEN", o.support.byStatus) ? "warn" : undefined} href="/admin/support"
          hint={n("OPEN", o.support.byStatus) ? "open requests" : "nothing waiting"} />
      </div>

      <Section title="Needs attention" hint={attention.length ? undefined : undefined}>
        {attention.length ? (
          <List>
            {attention.map((a) => (
              <ListRow key={a.href + a.text(a.c)} title={<Link href={a.href} className="hover:underline">{a.text(a.c)}</Link>} right="View →" />
            ))}
          </List>
        ) : (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-[15px] text-emerald-800">All clear. Nothing needs your attention.</p>
        )}
      </Section>

      <Section title="Latest payments" action={<Link href="/admin/payments" className="text-sm text-sky-700 underline underline-offset-2">See all</Link>}>
        <List empty="No payments yet.">{o.payments.recent.slice(0, 4).map((p) => <PaymentRow key={String(p.id)} p={p} />)}</List>
      </Section>

      <Section title="Latest support requests" action={<Link href="/admin/support" className="text-sm text-sky-700 underline underline-offset-2">See all</Link>}>
        <List empty="No support requests yet.">{o.support.recent.slice(0, 4).map((q) => <SupportRow key={String(q.id)} q={q} />)}</List>
      </Section>

      <Section title="New users" action={<Link href="/admin/users" className="text-sm text-sky-700 underline underline-offset-2">See all</Link>}>
        <List>{o.users.recent.slice(0, 5).map((u) => (
          <ListRow key={u.id} title={<UserLink id={u.id} email={u.email} />} subtitle={u.name || "No name"} right={timeAgo(u.createdAt)} />
        ))}</List>
      </Section>

      <Section title="The numbers behind it" hint="How subscriptions and payments are split.">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Subscriptions"><Bars data={o.subscriptions.byStatus} /></Card>
          <Card title="Payments"><Bars data={o.payments.byStatus} /></Card>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          {o.devices.tokens} {o.devices.tokens === 1 ? "phone is" : "phones are"} registered for notifications · {o.preferences.fasterSearchOn} of {o.preferences.rows} saved preferences have Faster Search on.
          Everything else is in <Link href="/admin/tables" className="text-sky-700 underline underline-offset-2">Database</Link>.
        </p>
      </Section>
    </>
  );
}
