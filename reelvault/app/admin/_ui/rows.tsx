import { formatDate, formatMoney, humanize } from "@/lib/admin/format";
import { Badge, ListRow, StatusBadge, UserLink } from "./kit";
import type { Row } from "@/lib/admin/supabase";
import { isPaidActive, isTrialActive, type UserSummary } from "@/lib/admin/data";

// Row layouts shared by the list pages and the user page, so the same thing always looks the same.

const s = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const day = (v: unknown) => formatDate(v ? String(v) : null, false);

export function UserRow({ u }: { u: UserSummary }) {
  return (
    <ListRow
      title={<UserLink id={u.id} email={u.email || u.id} />}
      subtitle={u.name || "No name"}
      badges={<>
        <Badge raw={u.access}>{u.access === "None" ? "No access" : u.access}</Badge>
        {!u.confirmed ? <Badge raw="Unconfirmed">Unconfirmed</Badge> : null}
        {u.banned ? <Badge raw="Suspended">Suspended</Badge> : null}
      </>}
      right={day(u.createdAt)} rightHint="joined"
      details={[
        ["Last sign-in", formatDate(u.lastSignIn)], ["Plan", `${humanize(u.plan)} · ${humanize(u.subStatus)}`],
        ["Paid (live, net)", u.paidMinor ? formatMoney(u.paidMinor) : "—"], ["Support requests", String(u.support)],
        ["Notification devices", String(u.devices)], ["User id", <code key="i" className="text-xs">{u.id}</code>],
      ]}
    />
  );
}

export function SubscriptionRow({ sub }: { sub: Row & { owner_email?: string } }) {
  const paid = isPaidActive(sub), trial = isTrialActive(sub);
  const waiting = sub.status === "PENDING";
  const trialOver = sub.status === "TRIAL" && !trial && !paid; // the stored status is only updated lazily when a trial runs out
  const access = paid ? `Paid until ${day(sub.subscription_end_date)}` : trial ? `Trial ends ${day(sub.trial_end_date)}` : waiting ? "Waiting for payment" : sub.trial_end_date ? `Trial ended ${day(sub.trial_end_date)}` : "No plan chosen yet";
  return (
    <ListRow
      title={<UserLink id={sub.user_id} email={sub.owner_email} />}
      subtitle={access}
      badges={<>{trialOver ? <Badge raw="EXPIRED">Trial ended</Badge> : <StatusBadge status={sub.status} />}<Badge raw={String(sub.plan)}>{humanize(sub.plan)}</Badge>{sub.razorpay_mode === "test" && sub.razorpay_subscription_id ? <Badge raw="Test">Test mode</Badge> : null}</>}
      right={day(sub.updated_at)} rightHint="updated"
      details={[
        ["Trial", `${day(sub.trial_start_date)} → ${day(sub.trial_end_date)}`], ["Paid period", `${day(sub.subscription_start_date)} → ${day(sub.subscription_end_date)}`],
        ["Razorpay subscription", s(sub.razorpay_subscription_id)], ["Razorpay customer", s(sub.razorpay_customer_id)],
        ["Razorpay mode", s(sub.razorpay_mode)], ["Created", formatDate(String(sub.created_at ?? ""))], ["User id", <code key="u" className="text-xs">{s(sub.user_id)}</code>],
      ]}
    />
  );
}

export function PaymentRow({ p, showUser = true }: { p: Row & { owner_email?: string }; showUser?: boolean }) {
  const refunded = Number(p.amount_refunded_minor ?? 0);
  return (
    <ListRow
      title={formatMoney(Number(p.amount_minor), String(p.currency))}
      badges={<><StatusBadge status={p.status} />{p.livemode ? null : <Badge raw="Test">Test mode</Badge>}{refunded ? <Badge tone="warn">{formatMoney(refunded)} refunded</Badge> : null}</>}
      subtitle={<>{showUser ? <><UserLink id={p.user_id} email={p.owner_email} /> · </> : null}{p.method ? humanize(p.method) : "Method unknown"}</>}
      right={formatDate(p.razorpay_created_at ? String(p.razorpay_created_at) : null)}
      details={[
        ["Payment id", <code key="a" className="text-xs">{s(p.id)}</code>], ["Order id", s(p.razorpay_order_id)], ["Invoice id", s(p.razorpay_invoice_id)],
        ["Subscription id", s(p.razorpay_subscription_id)], ["Razorpay fee", p.fee_minor === null ? "—" : formatMoney(Number(p.fee_minor))],
        ["GST on fee", p.tax_minor === null ? "—" : formatMoney(Number(p.tax_minor))], ["Failure reason", s(p.error_description)],
        ["Recorded", formatDate(String(p.created_at ?? ""))],
      ]}
    />
  );
}

export function SupportRow({ q, showUser = true }: { q: Row; showUser?: boolean }) {
  return (
    <ListRow
      title={s(q.subject)}
      subtitle={`${s(q.user_name)} · ${s(q.user_email)}`}
      badges={<StatusBadge status={q.status} />}
      right={formatDate(String(q.created_at ?? ""))}
      open={q.status === "OPEN"}
      body={<div className="space-y-3">
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-800">{s(q.message)}</p>
        <p className="text-sm text-zinc-500">{showUser ? <><UserLink id={q.user_id} email="Open this user" /> · </> : null}request id <code className="text-xs">{s(q.id)}</code></p>
      </div>}
    />
  );
}
