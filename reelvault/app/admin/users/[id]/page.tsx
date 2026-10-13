import Link from "next/link";
import { notFound } from "next/navigation";
import { DONE_MESSAGES, ERROR_MESSAGES, pickMessage, readBackendConfig } from "@/lib/admin/actions";
import { getUserDetail, getUserForAction, isPaidActive, isTrialActive } from "@/lib/admin/data";
import { formatDate, formatMoney, humanize, maskToken } from "@/lib/admin/format";
import { Badge, Banner, Card, Json, Kv, List, PageHeader, Section, StatusBadge } from "../../_ui/kit";
import { PaymentRow, SupportRow } from "../../_ui/rows";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const day = (v: unknown) => formatDate(v ? String(v) : null, false);

export default async function UserDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const d = await getUserDetail(id);
  if (!d) notFound();
  const target = await getUserForAction(id); // null once the account is gone
  const done = pickMessage(DONE_MESSAGES, first(sp.done));
  const error = pickMessage(ERROR_MESSAGES, first(sp.error));
  const { user, subscription: sub, preferences: prefs } = d;
  const access = isPaidActive(sub) ? (sub?.razorpay_mode === "test" ? "Paid (test)" : "Paid") : isTrialActive(sub) ? "Trial" : "None";
  const paid = d.payments.filter((p) => (p.status === "captured" || p.status === "refunded") && p.livemode).reduce((t, p) => t + Number(p.amount_minor ?? 0) - Number(p.amount_refunded_minor ?? 0), 0);
  const name = String(user?.user_metadata?.display_name ?? user?.user_metadata?.name ?? "");

  return (
    <>
      <PageHeader title={user?.email || "Deleted user"} subtitle={name || "No display name"}>
        <Link href="/admin/users" className="text-sm text-sky-700 underline underline-offset-2">← All users</Link>
      </PageHeader>

      {done ? <Banner tone="good">{done}</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {target?.suspended ? <Banner tone="warn">This account is <strong>suspended</strong>: the person can&apos;t sign in.</Banner> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Plan">
          <div className="mb-4 flex flex-wrap gap-2"><Badge raw={access}>{access === "None" ? "No access" : access}</Badge>{sub ? <StatusBadge status={sub.status} /> : null}</div>
          {sub ? <Kv columns={1} items={[
            ["Plan", humanize(sub.plan)],
            ["Free trial", `${day(sub.trial_start_date)} → ${day(sub.trial_end_date)}`],
            ["Paid period", `${day(sub.subscription_start_date)} → ${day(sub.subscription_end_date)}`],
            ["Paid so far (live, net)", paid ? formatMoney(paid) : "—"],
          ]} /> : <p className="text-sm text-zinc-500">No subscription record yet.</p>}
        </Card>
        <Card title="Account">
          {user ? <Kv columns={1} items={[
            ["Email confirmed", user.email_confirmed_at ? formatDate(user.email_confirmed_at) : "Not confirmed"],
            ["Joined", formatDate(user.created_at)], ["Last sign-in", formatDate(user.last_sign_in_at)],
            ["Phone", user.phone || "—"],
          ]} /> : <p className="text-sm text-zinc-500">This account no longer exists in Supabase Auth. The records below are what remains.</p>}
        </Card>
      </div>

      {target ? (
        <Section title="Account actions">
          <Card>
            {target.isAdmin ? (
              <p className="text-[15px] text-zinc-600">This is an admin account, so it can&apos;t be suspended or deleted from the dashboard.</p>
            ) : !readBackendConfig() ? (
              <p className="text-[15px] text-zinc-600">Account actions are switched off. Set <code>BACKEND_URL</code> and <code>ADMIN_API_KEY</code> (the same key as on the backend) and restart.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  {target.suspended
                    ? <Link href={`/admin/users/${id}/confirm?action=unsuspend`} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-emerald-700">Reinstate account</Link>
                    : <Link href={`/admin/users/${id}/confirm?action=suspend`} className="rounded-xl bg-amber-600 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-amber-700">Suspend account</Link>}
                  <Link href={`/admin/users/${id}/confirm?action=delete`} className="rounded-xl border border-red-300 px-5 py-2.5 text-[15px] font-semibold text-red-700 hover:bg-red-50">Delete account…</Link>
                </div>
                <p className="mt-4 text-sm text-zinc-500">Suspending is reversible and keeps all data. Deleting is permanent. You&apos;ll be asked to confirm either way.</p>
              </>
            )}
          </Card>
        </Section>
      ) : null}

      <Section title={`Payments (${d.payments.length})`}>
        <List empty="No payments from this user.">{d.payments.map((p) => <PaymentRow key={String(p.id)} p={p} showUser={false} />)}</List>
      </Section>

      <Section title={`Support requests (${d.support.length})`}>
        <List empty="No support requests from this user.">{d.support.map((q) => <SupportRow key={String(q.id)} q={q} showUser={false} />)}</List>
      </Section>

      <Section title="Technical details" hint="Identifiers and settings, for when you need them.">
        <details className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-4 text-[15px] font-medium hover:bg-zinc-50">Show technical details</summary>
          <div className="space-y-6 border-t border-zinc-100 px-5 py-5">
            <Kv items={[
              ["User id", <code key="i" className="text-xs">{id}</code>],
              ["Faster Search switch", prefs ? (prefs.faster_search ? "On" : "Off") : "Default (on)"],
              ["Razorpay subscription", String(sub?.razorpay_subscription_id ?? "—")], ["Razorpay customer", String(sub?.razorpay_customer_id ?? "—")],
              ["Razorpay mode", String(sub?.razorpay_mode ?? "—")], ["Banned until", user?.banned_until ? formatDate(user.banned_until) : "—"],
              ["Notification devices", d.tokens.length ? d.tokens.map((t) => `${maskToken(String(t.token))} (${String(t.platform)})`).join(", ") : "None"],
            ]} />
            {user ? <div className="grid gap-3 md:grid-cols-2"><div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">User metadata</p><Json value={user.user_metadata} /></div><div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">App metadata</p><Json value={user.app_metadata} /></div></div> : null}
          </div>
        </details>
      </Section>
    </>
  );
}
