import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { UrlFilters } from "@/components/filters/url-filters";
import { serverApi } from "@/lib/server-api";
import { formatDate } from "@/lib/format";
import type { Complaint, PageResult } from "@/lib/types";
type SP=Promise<Record<string,string|string[]|undefined>>;const one=(x:string|string[]|undefined)=>Array.isArray(x)?x[0]:x;
export default async function Complaints({searchParams}:{searchParams:SP}){const s=await searchParams;const q=new URLSearchParams();if(one(s.status))q.set("status",one(s.status)!);if(one(s.page))q.set("page",one(s.page)!);const data=await serverApi<PageResult<Complaint>>(`/api/v1/me/complaints?${q}`);return <div className="space-y-7"><PageHeader eyebrow="SUPPORT" title="Complaints" description="Track billing questions and disputes opened from your account." action={<ButtonLink href="/complaints/new">New complaint</ButtonLink>}/><Suspense><UrlFilters statusOptions={[{value:"open",label:"Open"},{value:"in_progress",label:"In progress"},{value:"resolved",label:"Resolved"}]}/></Suspense><div className="space-y-3">{data.items.map(c=><Card key={c.id} className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[9px] font-bold tracking-[.07em] text-forest">{c.category.replaceAll("_"," ").toUpperCase()}</p><h2 className="mt-2 font-display text-lg font-bold">{c.subject}</h2><p className="mt-2 text-sm leading-6 text-info">{c.message}</p>{c.response?<div className="mt-4 rounded-md bg-muted p-4"><p className="font-mono text-[9px] font-bold text-forest">BILLING OFFICER RESPONSE</p><p className="mt-2 text-sm leading-6">{c.response}</p></div>:null}<p className="mt-4 font-mono text-[9px] text-info">UPDATED {formatDate(c.updated_at)}</p></div><Badge value={c.status}/></div></Card>)}</div><Pager page={data.page} pages={data.pages} pathname="/complaints" params={{status:one(s.status)}}/></div>}
