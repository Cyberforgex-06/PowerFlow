import {PremiumHome} from "@/components/landing/premium-home";
import {safeServerApi} from "@/lib/server-api";
import type {Tariff} from "@/lib/types";
export default async function Landing(){const data=await safeServerApi<{items:Tariff[]}>("/api/v1/public/tariffs");return <PremiumHome tariffs={data?.items??[]}/>}
