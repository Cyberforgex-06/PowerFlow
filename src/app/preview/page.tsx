import { Shell } from "@/components/shell";
import { Dashboard } from "@/components/dashboard";
import type { Tables } from "@/lib/database.types";
const meters: Tables<"meters">[] = [
  {
    id: "preview-meter",
    customer_id: "preview",
    meter_number: "7392 2810 4567",
    meter_type: "postpaid",
    status: "active",
    address: "Lagos, Nigeria",
    created_at: "2026-09-01T00:00:00Z",
  },
];
const bills: Tables<"bills">[] = [286, 242, 268, 218, 195, 230].map(
  (units, index) => ({
    id: `preview-bill-${index}`,
    customer_id: "preview",
    meter_id: "preview-meter",
    reading_id: null,
    tariff_id: null,
    billing_period_start: `2026-${String(9 - index).padStart(2, "0")}-01`,
    billing_period_end: `2026-${String(9 - index).padStart(2, "0")}-28`,
    units_consumed: units,
    energy_charge: units * 60,
    fixed_charge: 1000,
    tax_amount: 290,
    total_amount: units * 60 + 1290,
    status: index === 0 ? "pending" : "paid",
    due_date:
      index === 0
        ? "2026-10-10"
        : `2026-${String(10 - index).padStart(2, "0")}-10`,
    created_at: "2026-09-28T00:00:00Z",
  }),
);
export default function Preview() {
  return (
    <Shell name="Emmanuel" preview>
      <Dashboard name="Emmanuel" bills={bills} meters={meters} preview />
    </Shell>
  );
}
