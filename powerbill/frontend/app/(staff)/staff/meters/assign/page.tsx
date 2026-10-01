import { AssignMeterForm } from "@/components/staff/assign-meter-form";
import { PageHeader } from "@/components/ui/page-header";
import { serverApi } from "@/lib/server-api";
import type { Tariff } from "@/lib/types";
export default async function AssignMeter(){const {items}=await serverApi<{items:Tariff[]}>("/api/v1/public/tariffs");return <div className="space-y-7"><PageHeader eyebrow="METER ASSIGNMENT" title="Assign meter" description="Create the meter baseline once. Future readings cannot move backwards."/><AssignMeterForm tariffs={items}/></div>}
