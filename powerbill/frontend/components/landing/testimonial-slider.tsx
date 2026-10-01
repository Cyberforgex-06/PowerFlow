"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
// SAMPLE CONTENT: replace before launch. These fictional names are not real customers.
const items=[
 {quote:"I could finally see how the reading, tariff and VAT became the amount on my bill.",name:"Chidinma E.",level:"Sample customer account"},
 {quote:"The receipt reference gives me one place to check what was paid and when.",name:"Tunde A.",level:"Sample customer account"},
 {quote:"Entering a meter reading feels straightforward because the previous value is always visible.",name:"Amina Y.",level:"Sample customer account"},
 {quote:"The bill breakdown makes it much easier to raise a specific complaint instead of guessing.",name:"Femi K.",level:"Sample customer account"},
];
export function TestimonialSlider(){const [i,setI]=useState(0);const x=items[i];return <section className="rounded-[1.75rem] border border-line bg-white p-7 shadow-soft md:p-10"><p className="font-mono text-[9px] font-bold tracking-[.08em] text-status-unpaid">SAMPLE TESTIMONIAL · REPLACE BEFORE LAUNCH</p><blockquote className="mt-6 max-w-4xl font-display text-2xl font-bold leading-tight tracking-[-.025em] md:text-4xl">“{x.quote}”</blockquote><div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{x.name}</p><p className="text-sm text-info">{x.level}</p></div><div className="flex items-center gap-3"><span className="font-mono text-xs text-info">{i+1} / {items.length}</span><button aria-label="Previous testimonial" className="grid size-11 place-items-center rounded-full border border-line" onClick={()=>setI(v=>(v-1+items.length)%items.length)}><ChevronLeft size={18} strokeWidth={1.8}/></button><button aria-label="Next testimonial" className="grid size-11 place-items-center rounded-full border border-line" onClick={()=>setI(v=>(v+1)%items.length)}><ChevronRight size={18} strokeWidth={1.8}/></button></div></div></section>}
