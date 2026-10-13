import { getSubscriptions, SUB_STATUSES } from "@/lib/admin/data";
import { parsePage, pickOne } from "@/lib/admin/safe";
import { FilterBar, List, PageHeader, Pager } from "../_ui/kit";
import { SubscriptionRow } from "../_ui/rows";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SubscriptionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = pickOne(sp.status, SUB_STATUSES);
  const data = await getSubscriptions({ page: parsePage(sp.page), status });
  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Each user's free trial or paid plan, and until when it lasts." />
      <FilterBar action="/admin/subscriptions" selects={[{ name: "status", value: status, label: "Status", options: SUB_STATUSES }]} />
      <List empty="No subscriptions.">{data.rows.map((s) => <SubscriptionRow key={String(s.user_id)} sub={s} />)}</List>
      <Pager page={data.page} pages={data.pages} total={data.total} path="/admin/subscriptions" params={{ status }} noun="subscriptions" />
    </>
  );
}
