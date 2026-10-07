import type { HTMLAttributes } from "react";
export function Card({ className="", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`pb-card rounded-card border border-line bg-white shadow-soft ${className}`} {...props} />;
}
