"use client";

import { useEffect, useRef } from "react";

export function AnimatedValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    const match = value.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!element || !match || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const number = Number(match[2].replaceAll(",", ""));
    if (!Number.isFinite(number) || number === 0 || preference.matches) return;
    const decimals = match[2].split(".")[1]?.length ?? 0;
    const format = new Intl.NumberFormat("en-NG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: match[2].includes(",") });
    let frame = 0;
    const reset = () => { cancelAnimationFrame(frame); element.textContent = value; };
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (preference.matches) return;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 700, 1);
        element.textContent = progress === 1 ? value : `${match[1]}${format.format(number * (1 - (1 - progress) ** 3))}${match[3]}`;
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(element);
    preference.addEventListener("change", reset);
    return () => { observer.disconnect(); reset(); preference.removeEventListener("change", reset); };
  }, [value]);
  return <><span className="sr-only">{value}</span><span ref={ref} aria-hidden="true">{value}</span></>;
}
