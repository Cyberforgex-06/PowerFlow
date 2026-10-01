import type { CustomerDashboard } from "@/lib/types";
export function UsageBars({ data }: { data: CustomerDashboard["usage_6_months"] }) {
  const vals=data.map(x=>Number(x.units)); const max=Math.max(1,...vals);
  return <div className="overflow-x-auto"><svg viewBox="0 0 720 240" className="min-w-[560px] w-full" role="img" aria-label="Six month electricity usage bar chart">{data.map((d,i)=>{const h=(Number(d.units)/max)*150; const x=42+i*110; return <g key={d.month}><rect x={x} y={182-h} width="52" height={h} rx="8" fill={i===data.length-1?"#16452E":"#D4DDD7"}/><text x={x+26} y="208" textAnchor="middle" fontSize="12" fill="#667085">{new Date(`${d.month.slice(0,7)}-01T00:00:00`).toLocaleDateString("en-NG",{month:"short"})}</text><text x={x+26} y={Math.max(18,174-h)} textAnchor="middle" fontSize="11" fill="#475467">{Math.round(Number(d.units))}</text></g>})}</svg></div>;
}
