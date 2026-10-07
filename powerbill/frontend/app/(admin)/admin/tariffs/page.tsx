import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { TariffForm } from "@/components/admin/tariff-form";
import { serverApi } from "@/lib/server-api";
import { formatNaira } from "@/lib/format";
import type { Tariff } from "@/lib/types";
export default async function Tariffs(){const {items}=await serverApi<{items:Tariff[]}>("/api/v1/admin/tariffs");return <div className="space-y-8"><PageHeader eyebrow="BILLING CONFIGURATION" title="Tariffs" description="Create or edit tariff values. Existing bills are unaffected because their rate, fixed charge and VAT are stored as snapshots."/><section><h2 className="mb-4 font-display text-xl font-bold">Create tariff</h2><TariffForm/></section><section className="space-y-4"><h2 className="font-display text-xl font-bold">Existing tariffs</h2>{items.map(t=><div key={t.id}><div className="mb-2 flex flex-wrap items-center gap-3"><span className="font-semibold">{t.name}</span><Badge value={t.is_active?"active":"inactive"}/><span className="data-number text-xs text-info">{formatNaira(t.rate_per_kwh)}/kWh · Fixed {formatNaira(t.fixed_charge)} · VAT {t.vat_percent}%</span></div><TariffForm tariff={t}/></div>)}</section></div>}
