import type { Tables } from "./database.types";
export function billStatus(
  bill: Pick<Tables<"bills">, "status" | "due_date">,
  today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
) {
  return bill.status === "pending" && bill.due_date < today
    ? "overdue"
    : bill.status;
}
export function outstanding(bills: Tables<"bills">[]) {
  return bills
    .filter((b) => b.status === "pending" || b.status === "overdue")
    .reduce((sum, b) => sum + (b.total_amount ?? 0), 0);
}
export function safeNext(value: string | null) {
  return value === "/reset-password" ? value : "/dashboard";
}
