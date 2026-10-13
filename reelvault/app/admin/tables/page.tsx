import Link from "next/link";
import { getTableList } from "@/lib/admin/data";
import { List, ListRow, PageHeader } from "../_ui/kit";

export default async function TablesPage() {
  const tables = await getTableList();
  return (
    <>
      <PageHeader title="Database" subtitle="The raw tables behind the dashboard, for when you need to see exactly what is stored. Open a table to read its rows." />
      <List>
        {tables.map((t) => (
          <ListRow
            key={t.name}
            title={<Link href={`/admin/tables/${t.name}`} className="text-sky-700 underline underline-offset-2">{t.name}</Link>}
            subtitle={t.name === "auth_users" ? "Sign-in accounts (Supabase Auth)" : `${t.columns.length} columns`}
            right={t.count.toLocaleString("en-IN")} rightHint={t.count === 1 ? "row" : "rows"}
            body={<p className="text-sm leading-relaxed text-zinc-600"><span className="font-medium text-zinc-800">Columns: </span>{t.columns.map((c) => c.name).join(", ")}</p>}
          />
        ))}
      </List>
    </>
  );
}
