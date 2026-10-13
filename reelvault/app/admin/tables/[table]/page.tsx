import Link from "next/link";
import { notFound } from "next/navigation";
import { getTablePage, SENSITIVE_COLUMNS } from "@/lib/admin/data";
import { maskToken } from "@/lib/admin/format";
import { parsePage } from "@/lib/admin/safe";
import { CellValue, PageHeader, Pager } from "../../_ui/kit";

type Props = {
  params: Promise<{ table: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TablePage({ params, searchParams }: Props) {
  const { table } = await params;
  const page = parsePage((await searchParams).page);
  const data = await getTablePage(table, page); // refuses any name that is not a real table
  if (!data) notFound();
  return (
    <>
      <PageHeader title={table} subtitle={`${data.total.toLocaleString("en-IN")} ${data.total === 1 ? "row" : "rows"}, newest first. Scroll sideways to see every column.`}>
        <Link href="/admin/tables" className="text-sm text-sky-700 underline">← All tables</Link>
      </PageHeader>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>{data.columns.map((c) => <th key={c} className="whitespace-nowrap px-4 py-3 font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {data.rows.map((row, i) => (
              <tr key={i} className="align-top hover:bg-zinc-50/70">
                {data.columns.map((c) => (
                  <td key={c} className="max-w-xs px-4 py-3">
                    {SENSITIVE_COLUMNS.has(c) ? <code>{maskToken(String(row[c] ?? ""))}</code> : <CellValue name={c} value={row[c]} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!data.rows.length ? <p className="p-8 text-center text-sm text-zinc-500">This table is empty.</p> : null}
      </div>
      <Pager page={page} pages={data.pages} total={data.total} path={`/admin/tables/${table}`} noun="rows" />
    </>
  );
}
