import { PageHeader } from "@/components/ui/page-header";
import { ReadingForm } from "@/components/customer/reading-form";
import { serverApi } from "@/lib/server-api";
import type { Meter } from "@/lib/types";
export const metadata={title:"Submit Reading"};
export default async function SubmitReading(){const {items}=await serverApi<{items:Meter[]}>("/api/v1/me/meters");return <div className="space-y-7"><PageHeader eyebrow="METER READING" title="Submit meter reading" description="The server decides the billing month and generates the bill in the same database transaction."/><ReadingForm meters={items}/></div>}
