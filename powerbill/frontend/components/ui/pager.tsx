import Link from "next/link";
export function Pager({ page, pages, pathname, params }: { page: number; pages: number; pathname: string; params: Record<string,string|undefined> }) {
  if (pages <= 1) return null;
  const make = (p:number) => { const q=new URLSearchParams(); Object.entries(params).forEach(([k,v])=>{if(v) q.set(k,v)}); q.set("page",String(p)); return `${pathname}?${q}`; };
  return <nav aria-label="Pagination" className="flex flex-wrap items-center gap-2">
    <Link aria-disabled={page<=1} className={`rounded-md border border-line px-3 py-2 font-mono text-xs ${page<=1?"pointer-events-none opacity-40":"hover:border-forest"}`} href={make(Math.max(1,page-1))}>Previous</Link>
    <span className="font-mono text-xs text-info">Page {page} of {pages}</span>
    <Link aria-disabled={page>=pages} className={`rounded-md border border-line px-3 py-2 font-mono text-xs ${page>=pages?"pointer-events-none opacity-40":"hover:border-forest"}`} href={make(Math.min(pages,page+1))}>Next</Link>
  </nav>;
}
