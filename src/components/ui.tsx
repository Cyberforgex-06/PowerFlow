import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">POWERFLOW</span>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  return <span className={`badge status-${status}`}>{status}</span>;
}
