import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "text";
const styles: Record<Variant, string> = {
  primary: "pb-button-primary bg-forest text-paper border-forest hover:bg-forest-dark active:translate-y-px",
  secondary: "bg-white text-ink border-line hover:border-forest hover:text-forest active:translate-y-px",
  danger: "bg-white text-status-overdue border-status-overdue hover:bg-[#FFF0EE] active:translate-y-px",
  text: "bg-transparent text-forest border-transparent hover:underline underline-offset-4",
};
const base = "pb-button inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant="primary", className="", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}
export function ButtonLink({ variant="primary", className="", children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; children: ReactNode }) {
  return <Link className={`${base} ${styles[variant]} ${className}`} {...props}>{children}</Link>;
}
