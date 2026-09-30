import Link from "next/link";
import { ReceiptText } from "lucide-react";
import type { Tables } from "@/lib/database.types";
import { billStatus } from "@/lib/billing";
import { date, month, money } from "@/lib/format";
import { Badge, Empty } from "./ui";
export function BillsList({
  bills,
  preview = false,
}: {
  bills: Tables<"bills">[];
  preview?: boolean;
}) {
  if (!bills.length)
    return (
      <Empty title="No bills yet">
        New bills will appear here once your provider issues them.
      </Empty>
    );
  return (
    <div className="bill-list">
      {bills.map((bill) => (
        <Link
          className="bill-row"
          href={preview ? "/login" : `/bills/${bill.id}`}
          key={bill.id}
        >
          <span className="bill-icon">
            <ReceiptText size={21} />
          </span>
          <div className="bill-info">
            <strong>{month(bill.billing_period_start)} electricity bill</strong>
            <span>
              Due {date(bill.due_date)} · {bill.units_consumed} kWh
            </span>
          </div>
          <div className="bill-amount">
            <strong>{money(bill.total_amount)}</strong>
            <Badge status={billStatus(bill)} />
          </div>
        </Link>
      ))}
    </div>
  );
}
