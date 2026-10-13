import Link from "next/link";
import { notFound } from "next/navigation";
import { parseAction, pickMessage, ERROR_MESSAGES } from "@/lib/admin/actions";
import { getUserForAction } from "@/lib/admin/data";
import { Banner, Card, PageHeader } from "../../../_ui/kit";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const COPY = {
  suspend: {
    title: "Suspend this account?",
    button: "Suspend account",
    tone: "bg-amber-600 hover:bg-amber-700",
    points: [
      "They can't sign in, and anywhere they are signed in will stop working within about a minute.",
      "When they try to sign in they are told their account has been suspended.",
      "Nothing is deleted: their saved reels, plan and payments stay exactly as they are, and billing is not touched.",
      "You can reinstate the account at any time.",
    ],
  },
  unsuspend: {
    title: "Reinstate this account?",
    button: "Reinstate account",
    tone: "bg-emerald-600 hover:bg-emerald-700",
    points: ["They can sign in again straight away.", "Everything is as they left it."],
  },
  delete: {
    title: "Delete this account permanently?",
    button: "Delete account permanently",
    tone: "bg-red-600 hover:bg-red-700",
    points: [
      "Their account and everything in it is erased: saved reels, summaries, tags, notification settings, support requests and their plan record.",
      "An active paid subscription is cancelled first, so they are not charged again. If that fails, nothing is deleted.",
      "Payment records are kept for accounting, no longer linked to them.",
      "When they try to sign in they are told their account was deleted.",
      "This cannot be undone.",
    ],
  },
} as const;

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const action = parseAction(Array.isArray(sp.action) ? sp.action[0] : sp.action);
  if (!action) notFound();
  const user = await getUserForAction(id);
  if (!user) notFound();
  const c = COPY[action];
  const error = pickMessage(ERROR_MESSAGES, Array.isArray(sp.error) ? sp.error[0] : sp.error);
  const label = user.email || user.id;

  return (
    <>
      <PageHeader title={c.title} subtitle={label}>
        <Link href={`/admin/users/${id}`} className="text-sm text-sky-700 underline underline-offset-2">← Back to this user</Link>
      </PageHeader>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {user.isAdmin ? (
        <Banner tone="warn">This is an admin account, so it can&apos;t be changed from the dashboard.</Banner>
      ) : (
        <Card>
          <ul className="mb-6 list-disc space-y-2 pl-5 text-[15px] text-zinc-700">{c.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <form action={`/admin/users/${id}/actions`} method="post" className="space-y-5">
            <input type="hidden" name="action" value={action} />
            {action === "delete" ? (
              <div>
                <label htmlFor="confirm_email" className="mb-1.5 block text-sm font-medium">Type <span className="font-mono">{label}</span> to confirm</label>
                <input id="confirm_email" name="confirm_email" required autoComplete="off" spellCheck={false} className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-[15px] sm:w-96" />
              </div>
            ) : null}
            <div>
              <label htmlFor="note" className="mb-1.5 block text-sm font-medium">Reason <span className="font-normal text-zinc-400">(optional, kept in the activity log, never shown to the person)</span></label>
              <input id="note" name="note" maxLength={300} autoComplete="off" className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-[15px]" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" className={`rounded-xl px-5 py-2.5 text-[15px] font-semibold text-white ${c.tone}`}>{c.button}</button>
              <Link href={`/admin/users/${id}`} className="text-[15px] text-zinc-500 underline underline-offset-2">Cancel</Link>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
