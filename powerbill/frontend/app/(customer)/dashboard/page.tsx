import { BillList } from "@/components/ui/bill-list";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { UsageBars } from "@/components/ui/usage-bars";
import { ButtonLink } from "@/components/ui/button";
import { serverApi } from "@/lib/server-api";
import { formatNaira } from "@/lib/format";
import type { CustomerDashboard } from "@/lib/types";
export const metadata={title:"Dashboard"};
export default async function Dashboard(){const data=await serverApi<CustomerDashboard>("/api/v1/me/dashboard");const latest=data.usage_6_months.at(-1);return <div className="space-y-8"><PageHeader eyebrow="CUSTOMER DASHBOARD" title="A little less on your mind." description="Your readings, bills and receipts. Everything in its place." action={<ButtonLink href="/submit-reading">Submit reading</ButtonLink>}/><section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatTile label="Outstanding balance" value={formatNaira(data.outstanding_balance)}/><StatTile label="Unpaid bills" value={String(data.unpaid_count)}/><StatTile label="Latest usage" value={latest?`${Number(latest.units).toFixed(1)} kWh`:"—"}/><StatTile label="Billing history" value={`${data.recent_bills.length} recent`}/></section><Card className="p-5 md:p-6"><div><p className="font-mono text-[10px] font-bold tracking-[.07em] text-forest">6-MONTH USAGE</p><h2 className="mt-2 font-display text-xl font-bold md:text-2xl">Your electricity over time</h2></div><div className="mt-5"><UsageBars data={data.usage_6_months}/></div></Card><section><div className="mb-4 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] font-bold tracking-[.07em] text-forest">RECENT BILLS</p><h2 className="mt-2 font-display text-2xl font-bold">Every bill, accounted for.</h2></div><ButtonLink variant="text" href="/bills">View all</ButtonLink></div><BillList bills={data.recent_bills}/></section></div>}
