import { Suspense } from "react";
import { BillList } from "@/components/ui/bill-list";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { UrlFilters } from "@/components/filters/url-filters";
import { serverApi } from "@/lib/server-api";
import type { Bill, PageResult } from "@/lib/types";
export const metadata={title:"My Bills"};
type SP=Promise<Record<string,string|string[]|undefined>>;
const one=(x:string|string[]|undefined)=>Array.isArray(x)?x[0]:x;
export default async function Bills({searchParams}:{searchParams:SP}){const s=await searchParams;const q=new URLSearchParams();for(const k of ["status","month","q","page"]){const v=one(s[k]);if(v)q.set(k,v)}const data=await serverApi<PageResult<Bill>>(`/api/v1/me/bills?${q}`);return <div className="space-y-7"><PageHeader eyebrow="BILL HISTORY" title="My Bills" description="Filter your bills by status or billing month. On phones, every row becomes a touch-friendly bill card."/><Suspense><UrlFilters showMonth statusOptions={[{value:"paid",label:"Paid"},{value:"unpaid",label:"Unpaid"},{value:"overdue",label:"Overdue"}]}/></Suspense><BillList bills={data.items}/><Pager page={data.page} pages={data.pages} pathname="/bills" params={{status:one(s.status),month:one(s.month),q:one(s.q)}}/></div>}
