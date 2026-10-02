import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { UrlFilters } from "@/components/filters/url-filters";
import { serverApi } from "@/lib/server-api";
import { formatKwh, formatDate } from "@/lib/format";
import type { Meter, PageResult } from "@/lib/types";
type SP=Promise<Record<string,string|string[]|undefined>>;const one=(x:string|string[]|undefined)=>Array.isArray(x)?x[0]:x;
export default async function Meters({searchParams}:{searchParams:SP}){const s=await searchParams;const q=new URLSearchParams();if(one(s.q))q.set("q",one(s.q)!);if(one(s.page))q.set("page",one(s.page)!);const data=await serverApi<PageResult<Meter>>(`/api/v1/staff/meters?${q}`);return <div className="space-y-7"><PageHeader eyebrow="METER REGISTER" title="Meters" description="Search assigned meter numbers and review their opening readings." action={<ButtonLink href="/staff/meters/assign">Assign meter</ButtonLink>}/><Suspense><UrlFilters showSearch/></Suspense><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.items.map(m=><Card key={m.id} className="p-5"><p className="font-mono text-[9px] font-bold tracking-[.07em] text-forest">{m.is_active?"ACTIVE METER":"INACTIVE METER"}</p><h2 className="data-number mt-3 text-xl font-bold">{m.meter_number}</h2><dl className="mt-5 grid gap-3 text-sm"><div><dt className="text-info">Opening reading</dt><dd className="data-number font-semibold">{formatKwh(m.opening_reading)}</dd></div><div><dt className="text-info">Assigned</dt><dd>{formatDate(m.assigned_at)}</dd></div><div><dt className="text-info">Customer ID</dt><dd className="data-number break-all text-xs">{m.customer_id}</dd></div></dl></Card>)}</div><Pager page={data.page} pages={data.pages} pathname="/staff/meters" params={{q:one(s.q)}}/></div>}
