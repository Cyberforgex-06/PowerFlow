import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ComplaintResponseForm } from "@/components/staff/complaint-response-form";
import { serverApi } from "@/lib/server-api";
import type { Complaint, PageResult } from "@/lib/types";
// Phase 2 has no GET-by-id complaint endpoint; load a bounded page and select the requested complaint.
export default async function Respond({params}:{params:Promise<{id:string}>}){const {id}=await params;let found:Complaint|undefined;for(let page=1;page<=5&&!found;page++){const data=await serverApi<PageResult<Complaint>>(`/api/v1/staff/complaints?page=${page}`);found=data.items.find(c=>c.id===id);if(page>=data.pages)break}if(!found)notFound();return <div className="space-y-7"><PageHeader eyebrow="COMPLAINT RESPONSE" title={found.subject} description="Respond with a clear status and message. Do not expose internal audit details to the customer."/><div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><Card className="p-5"><Badge value={found.status}/><p className="mt-5 text-sm leading-6">{found.message}</p><p className="mt-5 font-mono text-[9px] text-info">CUSTOMER {found.customer_id}</p></Card><Card className="p-5 md:p-6"><ComplaintResponseForm complaint={found}/></Card></div></div>}
