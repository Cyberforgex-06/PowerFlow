import Link from "next/link";
import { Badge } from "./badge";
import { Card } from "./card";
import type { Bill } from "@/lib/types";
import { formatKwh, formatNaira, monthLabel } from "@/lib/format";
export function BillList({ bills, base="/bills" }: { bills: Bill[]; base?: string }) {
  if (!bills.length) return <Card className="p-6 text-sm text-info">No bills match these filters.</Card>;
  return <>
    <div className="space-y-3 md:hidden">{bills.map(b=><Card key={b.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-lg font-bold">{monthLabel(b.billing_month)}</h3><p className="mt-1 font-mono text-[10px] text-info">{b.meter_id.slice(0,8).toUpperCase()}</p></div><Badge value={b.status}/></div><div className="mt-5 flex items-end justify-between gap-3"><div><p className="data-number text-sm text-info">{formatKwh(b.units)}</p><p className="data-number mt-1 text-lg font-bold">{formatNaira(b.total_amount)}</p></div><Link className="min-h-11 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-forest" href={`${base}/${b.id}`}>View bill</Link></div></Card>)}</div>
    <div className="hidden overflow-hidden rounded-card border border-line bg-white md:block"><table className="w-full text-left text-sm"><thead className="bg-muted font-mono text-[10px] tracking-[.05em] text-info"><tr><th className="px-4 py-3">MONTH</th><th className="px-4 py-3">UNITS</th><th className="px-4 py-3">TOTAL</th><th className="px-4 py-3">DUE</th><th className="px-4 py-3">STATUS</th><th className="px-4 py-3"><span className="sr-only">Action</span></th></tr></thead><tbody>{bills.map(b=><tr key={b.id} className="border-t border-line-subtle"><td className="px-4 py-4 font-semibold">{monthLabel(b.billing_month)}</td><td className="data-number px-4 py-4">{formatKwh(b.units)}</td><td className="data-number px-4 py-4 font-bold">{formatNaira(b.total_amount)}</td><td className="px-4 py-4 text-info">{new Date(`${b.due_date}T00:00:00`).toLocaleDateString("en-NG")}</td><td className="px-4 py-4"><Badge value={b.status}/></td><td className="px-4 py-4 text-right"><Link className="font-semibold text-forest hover:underline" href={`${base}/${b.id}`}>View</Link></td></tr>)}</tbody></table></div>
  </>;
}
