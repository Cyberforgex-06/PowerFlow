import { ComplaintForm } from "@/components/customer/complaint-form";
import { PageHeader } from "@/components/ui/page-header";
import { serverApi } from "@/lib/server-api";
import type { Bill, PageResult } from "@/lib/types";
export default async function NewComplaint(){const bills=await serverApi<PageResult<Bill>>("/api/v1/me/bills?page=1");return <div className="space-y-7"><PageHeader eyebrow="NEW SUPPORT REQUEST" title="New complaint" description="Send a billing question or dispute to a billing officer. Keep passwords and payment-card details out of the message."/><ComplaintForm bills={bills.items}/></div>}
