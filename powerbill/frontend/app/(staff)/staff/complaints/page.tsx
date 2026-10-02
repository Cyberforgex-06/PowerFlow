import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { UrlFilters } from "@/components/filters/url-filters";
import { serverApi } from "@/lib/server-api";
import { formatDate } from "@/lib/format";
import type { Complaint, PageResult } from "@/lib/types";
type SP=Promise<Record<string,string|string[]|undefined>>;const one=(x:string|string[]|undefined)=>Array.isArray(x)?x[0]:x;
export default async function StaffComplaints({searchParams}:{searchParams:SP}){const s=await searchParams;const q=new URLSearchParams();if(one(s.status))q.set("status",one(s.status)!);if(one(s.page))q.set("page",one(s.page)!);const data=await serverApi<PageResult<Complaint>>(`/api/v1/staff/complaints?${q}`);return <div className="space-y-7"><PageHeader eyebrow="SUPPORT QUEUE" title="Complaints" description="Review billing disputes and customer questions. Responses and status changes are audited."/><Suspense><UrlFilters statusOptions={[{value:"open",label:"Open"},{value:"in_progress",label:"In progress"},{value:"resolved",label:"Resolved"}]}/></Suspense><div className="space-y-3">{data.items.map(c=><Link key={c.id} href={`/staff/complaints/${c.id}`}><Card className="p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-raised"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[9px] font-bold tracking-[.07em] text-forest">{c.category.replaceAll("_"," ").toUpperCase()}</p><h2 className="mt-2 font-display text-lg font-bold">{c.subject}</h2><p className="mt-2 line-clamp-2 text-sm text-info">{c.message}</p><p className="mt-3 font-mono text-[9px] text-info">UPDATED {formatDate(c.updated_at)}</p></div><Badge value={c.status}/></div></Card></Link>)}</div><Pager page={data.page} pages={data.pages} pathname="/staff/complaints" params={{status:one(s.status)}}/></div>}
