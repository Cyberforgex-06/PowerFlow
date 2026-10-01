import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { UrlFilters } from "@/components/filters/url-filters";
import { UserControls } from "@/components/admin/user-controls";
import { requireUser, serverApi } from "@/lib/server-api";
import { formatDate } from "@/lib/format";
import type { PageResult, User } from "@/lib/types";
type SP=Promise<Record<string,string|string[]|undefined>>;const one=(x:string|string[]|undefined)=>Array.isArray(x)?x[0]:x;
export default async function Users({searchParams}:{searchParams:SP}){const current=await requireUser(["admin"]);const s=await searchParams;const q=new URLSearchParams();for(const k of ["q","role","active","page"]){const v=one(s[k]);if(v)q.set(k,v)}const data=await serverApi<PageResult<User>>(`/api/v1/admin/users?${q}`);return <div className="space-y-7"><PageHeader eyebrow="ADMINISTRATION" title="Users" description="Change account roles and activation state. The API blocks administrators from changing their own role."/><Suspense><UrlFilters showSearch extra={{key:"role",label:"Role",options:[{value:"customer",label:"Customer"},{value:"billing_officer",label:"Billing officer"},{value:"admin",label:"Admin"}]}} extras={[{key:"active",label:"Account state",options:[{value:"true",label:"Active"},{value:"false",label:"Inactive"}]}]}/></Suspense><div className="space-y-3">{data.items.map(u=><Card key={u.id} className="p-5"><div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold">{u.full_name}</h2><Badge value={u.is_active?"active":"inactive"}/>{u.id===current.id?<span className="font-mono text-[9px] text-info">THIS ACCOUNT</span>:null}</div><p className="mt-1 text-sm text-info">{u.email}</p><p className="mt-3 font-mono text-[9px] text-info">CREATED {formatDate(u.created_at)} · {u.id}</p></div><UserControls user={u} currentUserId={current.id}/></div></Card>)}</div><Pager page={data.page} pages={data.pages} pathname="/admin/users" params={{q:one(s.q),role:one(s.role),active:one(s.active)}}/></div>}
