"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Progressive enhancement: content remains visible if scripts cannot run. */
export function PageMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!window.IntersectionObserver) return;
    const animations = new Set<Animation>();
    const seen = new WeakSet<Element>();
    const animate = (element: Element) => {
      if (preference.matches || seen.has(element)) return;
      seen.add(element);
      const animation = element.animate(
        [{ opacity: 0.3, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animate(entry.target); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".hero > *, main .section, .proof-strip, .cta, .auth-form, .pb-card").forEach(el => observer.observe(el));
    const onPreferenceChange = () => { if (preference.matches) animations.forEach(a => a.cancel()); };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      observer.disconnect();
      animations.forEach(a => a.cancel());
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, [pathname]);
  return null;
}
