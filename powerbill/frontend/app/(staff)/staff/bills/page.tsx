import { Suspense } from "react";
import { BillList } from "@/components/ui/bill-list";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { UrlFilters } from "@/components/filters/url-filters";
import { serverApi } from "@/lib/server-api";
import type { Bill, PageResult } from "@/lib/types";
type SP=Promise<Record<string,string|string[]|undefined>>;const one=(x:string|string[]|undefined)=>Array.isArray(x)?x[0]:x;
export default async function StaffBills({searchParams}:{searchParams:SP}){const s=await searchParams;const q=new URLSearchParams();for(const k of ["q","status","month","page"]){const v=one(s[k]);if(v)q.set(k,v)}const data=await serverApi<PageResult<Bill>>(`/api/v1/staff/bills?${q}`);return <div className="space-y-7"><PageHeader eyebrow="BILL REGISTER" title="All Bills" description="Search across customer names, emails and meter numbers; filter by status or billing month."/><Suspense><UrlFilters showSearch showMonth statusOptions={[{value:"paid",label:"Paid"},{value:"unpaid",label:"Unpaid"},{value:"overdue",label:"Overdue"}]}/></Suspense><BillList bills={data.items} base="/staff/bills"/><Pager page={data.page} pages={data.pages} pathname="/staff/bills" params={{q:one(s.q),status:one(s.status),month:one(s.month)}}/></div>}
