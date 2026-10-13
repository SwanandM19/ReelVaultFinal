import Link from "next/link";
import { getActionLog } from "@/lib/admin/data";
import { formatDate, humanize } from "@/lib/admin/format";
import { parsePage } from "@/lib/admin/safe";
import { Badge, Banner, List, ListRow, PageHeader, Pager } from "../_ui/kit";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const TONE = { suspend: "warn", unsuspend: "good", delete: "bad" } as const;

export default async function LogPage({ searchParams }: Props) {
  const data = await getActionLog(parsePage((await searchParams).page));
  return (
    <>
      <PageHeader title="Activity log" subtitle="Every suspension, reinstatement and deletion made from this dashboard: who did it, to whom, and when." />
      {data.missingTable ? (
        <Banner tone="warn">The activity log isn&apos;t set up yet. Run <code>account_actions.sql</code> in the Supabase SQL editor.</Banner>
      ) : (
        <>
          <List empty="Nothing has been done from the dashboard yet.">
            {data.rows.map((r) => (
              <ListRow
                key={String(r.id)}
                title={<>{humanize(r.action)} · {r.target_email ? <Link className="text-sky-700 underline underline-offset-2" href={`/admin/users/${r.target_user_id}`}>{r.target_email}</Link> : "a deleted account"}</>}
                subtitle={<>by {String(r.actor)}{r.note ? ` · “${String(r.note)}”` : ""}</>}
                badges={<Badge tone={TONE[String(r.action) as keyof typeof TONE] ?? "mute"}>{humanize(r.action)}</Badge>}
                right={formatDate(String(r.created_at))}
                details={[["Account id", <code key="i" className="text-xs">{String(r.target_user_id)}</code>]]}
              />
            ))}
          </List>
          <Pager page={data.page} pages={data.pages} total={data.total} path="/admin/log" noun="actions" />
        </>
      )}
    </>
  );
}
