import { getPayments, PAYMENT_STATUSES } from "@/lib/admin/data";
import { formatMoney } from "@/lib/admin/format";
import { parsePage, pickOne } from "@/lib/admin/safe";
import { FilterBar, List, PageHeader, Pager, Stat } from "../_ui/kit";
import { PaymentRow } from "../_ui/rows";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PaymentsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = pickOne(sp.status, PAYMENT_STATUSES);
  const mode = pickOne(sp.mode, ["live", "test"] as const);
  const data = await getPayments({ page: parsePage(sp.page), status, mode });
  const net = data.totals.gross - data.totals.refunded;
  return (
    <>
      <PageHeader title="Payments" subtitle="Payments reported by Razorpay. Card and UPI details are never stored." />
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Stat label="Money collected" value={formatMoney(net)} hint={data.totals.refunded ? `after ${formatMoney(data.totals.refunded)} refunded` : "successful payments, nothing refunded"} tone="good" />
        <Stat label="Razorpay charges" value={formatMoney(data.totals.fees + data.totals.tax)} hint={`${formatMoney(data.totals.fees)} fees + ${formatMoney(data.totals.tax)} GST`} />
      </div>
      <FilterBar action="/admin/payments" selects={[{ name: "status", value: status, label: "Status", options: PAYMENT_STATUSES }, { name: "mode", value: mode, label: "Mode", options: ["live", "test"], defaultLabel: "Live and test" }]} />
      <List empty="No payments recorded yet.">{data.rows.map((p) => <PaymentRow key={String(p.id)} p={p} />)}</List>
      <Pager page={data.page} pages={data.pages} total={data.total} path="/admin/payments" params={{ status, mode }} noun="payments" />
    </>
  );
}
