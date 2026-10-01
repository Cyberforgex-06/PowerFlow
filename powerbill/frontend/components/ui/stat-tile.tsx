import { AnimatedValue } from "../motion/animated-value";
import { Card } from "./card";
export function StatTile({ label, value, sublabel }: { label:string; value:string; sublabel?:string }) { return <Card className="p-4 md:p-5"><p className="data-number font-display text-2xl font-bold md:text-3xl"><AnimatedValue value={value}/></p><p className="mt-1 font-mono text-[10px] font-bold tracking-[.07em] text-info">{label.toUpperCase()}</p>{sublabel?<p className="mt-2 text-xs text-info">{sublabel}</p>:null}</Card>; }
