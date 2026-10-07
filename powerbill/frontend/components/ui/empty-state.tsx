import { CircleAlert, Inbox } from "lucide-react";
import { Card } from "./card";
export function EmptyState({ title, body, error=false }: { title: string; body: string; error?: boolean }) {
  const Icon = error ? CircleAlert : Inbox;
  return <Card className="flex min-h-48 flex-col items-start justify-center p-6"><Icon aria-hidden size={24} strokeWidth={1.8} className={error ? "text-status-overdue" : "text-forest"}/><h2 className="mt-4 font-display text-xl font-bold">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-info">{body}</p></Card>;
}
