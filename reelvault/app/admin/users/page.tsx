import { getUsers, USER_SORTS } from "@/lib/admin/data";
import { parsePage, pickOne, safeSearchTerm } from "@/lib/admin/safe";
import { DONE_MESSAGES, pickMessage } from "@/lib/admin/actions";
import { Banner, FilterBar, List, PageHeader, Pager } from "../_ui/kit";
import { UserRow } from "../_ui/rows";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UsersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = safeSearchTerm(Array.isArray(sp.q) ? sp.q[0] : sp.q);
  const sort = pickOne(sp.sort, USER_SORTS);
  const data = await getUsers({ page: parsePage(sp.page), q, sort });
  return (
    <>
      <PageHeader title="Users" subtitle="Everyone with a ReelVault account. Open a person to see the full record." />
      {pickMessage(DONE_MESSAGES, Array.isArray(sp.done) ? sp.done[0] : sp.done) ? <Banner tone="good">{pickMessage(DONE_MESSAGES, Array.isArray(sp.done) ? sp.done[0] : sp.done)}</Banner> : null}
      <FilterBar action="/admin/users" search={{ name: "q", value: q, placeholder: "Search by email or name" }} selects={[{ name: "sort", value: sort, label: "Sort", options: USER_SORTS, defaultLabel: "Newest first" }]} />
      <List empty="No users match your search.">{data.rows.map((u) => <UserRow key={u.id} u={u} />)}</List>
      <Pager page={data.page} pages={data.pages} total={data.total} path="/admin/users" params={{ q, sort }} noun="users" />
    </>
  );
}
