import { StaffReadingForm } from "@/components/staff/reading-form";
import { PageHeader } from "@/components/ui/page-header";
import { serverApi } from "@/lib/server-api";
import type { Meter, PageResult } from "@/lib/types";
export default async function EnterReading(){const meters=await serverApi<PageResult<Meter>>("/api/v1/staff/meters?page=1");return <div className="space-y-7"><PageHeader eyebrow="STAFF READING" title="Enter meter reading" description="A validated reading generates its bill in the same server transaction and uses the active tariff snapshot."/><StaffReadingForm meters={meters.items}/></div>}
