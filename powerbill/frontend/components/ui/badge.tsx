import type { BillStatus, ComplaintStatus } from "@/lib/types";

const statusClass: Record<string,string> = {
  paid: "border-[#B7D4C4] bg-[#E7F2EC] text-status-paid",
  unpaid: "border-[#F0D6A2] bg-[#FFF7E6] text-status-unpaid",
  overdue: "border-[#F3B8B2] bg-[#FFF0EE] text-status-overdue",
  open: "border-[#F0D6A2] bg-[#FFF7E6] text-status-unpaid",
  in_progress: "border-line bg-muted text-info",
  resolved: "border-[#B7D4C4] bg-[#E7F2EC] text-status-paid",
  active: "border-[#B7D4C4] bg-[#E7F2EC] text-status-paid",
  inactive: "border-line bg-muted text-info",
};

export function Badge({ value }: { value: BillStatus | ComplaintStatus | "active" | "inactive" | string }) {
  const label = value.replaceAll("_", " ").toUpperCase();
  return <span className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold tracking-[.05em] ${statusClass[value] ?? "border-line bg-white text-info"}`}>{label}</span>;
}
