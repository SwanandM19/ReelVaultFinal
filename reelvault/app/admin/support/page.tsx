import { getSupport, SUPPORT_STATUSES } from "@/lib/admin/data";
import { parsePage, pickOne } from "@/lib/admin/safe";
import { FilterBar, List, PageHeader, Pager } from "../_ui/kit";
import { SupportRow } from "../_ui/rows";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SupportPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = pickOne(sp.status, SUPPORT_STATUSES);
  const data = await getSupport({ page: parsePage(sp.page), status });
  return (
    <>
      <PageHeader title="Support requests" subtitle="What users sent through the Help Center. Open requests are expanded." />
      <FilterBar action="/admin/support" selects={[{ name: "status", value: status, label: "Status", options: SUPPORT_STATUSES }]} />
      <List empty="No support requests.">{data.rows.map((q) => <SupportRow key={String(q.id)} q={q} />)}</List>
      <Pager page={data.page} pages={data.pages} total={data.total} path="/admin/support" params={{ status }} noun="requests" />
    </>
  );
}
