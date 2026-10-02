import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const base = "min-h-12 w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-info/70 focus:border-forest focus:outline-none";
export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) { return <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">{children}</label>; }
export function FieldError({ children }: { children?: React.ReactNode }) { return children ? <p role="alert" className="mt-1.5 text-xs text-status-overdue">{children}</p> : null; }
export function Input({ className="", ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={`${base} ${className}`} {...props}/>; }
export function Select({ className="", ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={`${base} ${className}`} {...props}/>; }
export function Textarea({ className="", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={`${base} min-h-32 resize-y ${className}`} {...props}/>; }
