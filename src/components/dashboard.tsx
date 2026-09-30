import Link from "next/link";
import { Zap, Gauge, Wallet, ReceiptText } from "lucide-react";
import type { Tables } from "@/lib/database.types";
import { outstanding } from "@/lib/billing";
import { money, date } from "@/lib/format";
import { ConsumptionChart } from "./consumption-chart";
import { BillsList } from "./bills-list";
import { PageHeading, Empty, Badge } from "./ui";
export function Dashboard({
  name,
  bills,
  meters,
  preview = false,
}: {
  name: string;
  bills: Tables<"bills">[];
  meters: Tables<"meters">[];
  preview?: boolean;
}) {
  const unpaid = bills
    .filter((b) => b.status === "pending" || b.status === "overdue")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const latestPeriod = bills
    .filter((b) => b.status !== "cancelled")
    .map((b) => b.billing_period_start.slice(0, 7))
    .sort()
    .at(-1);
  const usage = bills
    .filter(
      (b) =>
        b.status !== "cancelled" &&
        b.billing_period_start.startsWith(latestPeriod ?? "none"),
    )
    .reduce((sum, b) => sum + b.units_consumed, 0);
  const destination = (path: string) => (preview ? "/login" : path);
  return (
    <>
      <PageHeading
        title={`Hello, ${name.split(" ")[0]}.`}
        description="Here’s where your electricity account stands."
        action={
          <Link className="button secondary" href={destination("/bills")}>
            <ReceiptText size={18} />
            View all bills
          </Link>
        }
      />
      <section className="stats-grid" aria-label="Account summary">
        <div className="stat-card">
          <div className="stat-label">
            Outstanding balance
            <Wallet size={19} />
          </div>
          <strong>{money(outstanding(bills))}</strong>
          <span>
            {unpaid.length
              ? `${unpaid.length} bill${unpaid.length === 1 ? "" : "s"} awaiting payment`
              : "You have no unpaid bills"}
          </span>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            Latest billed consumption
            <Zap size={19} />
          </div>
          <strong>
            {usage.toLocaleString("en-NG")}
            <small> kWh</small>
          </strong>
          <span>{latestPeriod ?? "No consumption recorded yet"}</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            Active meters
            <Gauge size={19} />
          </div>
          <strong>
            {meters
              .filter((m) => m.status === "active")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span>
            {meters.length
              ? `${meters.length} meter${meters.length === 1 ? "" : "s"} linked to your account`
              : "No meters linked yet"}
          </span>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Energy consumption</h2>
              <p>Your last six billed months</p>
            </div>
            <span className="chart-legend">
              <i />
              Electricity use
            </span>
          </div>
          <ConsumptionChart
            data={bills
              .filter((b) => b.status !== "cancelled")
              .map((b) => ({
                period: b.billing_period_start,
                units: b.units_consumed,
              }))}
          />
        </section>
        <section className="balance-card">
          <div className="balance-icon">
            <Zap size={26} />
          </div>
          <span className="eyebrow">NEXT ON YOUR ACCOUNT</span>
          <h2>{unpaid.length ? "Your next bill" : "You’re all caught up"}</h2>
          {unpaid[0] ? (
            <>
              <strong>{money(unpaid[0].total_amount)}</strong>
              <p>Payment due {date(unpaid[0].due_date)}</p>
              <Link
                className="button"
                href={destination(`/bills/${unpaid[0].id}`)}
              >
                View bill details
              </Link>
            </>
          ) : (
            <>
              <p>We’ll let you know when a new bill is available.</p>
              <Link className="button" href={destination("/notifications")}>
                View notifications
              </Link>
            </>
          )}
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent bills</h2>
            <Link href={destination("/bills")}>View all</Link>
          </div>
          <BillsList bills={bills.slice(0, 3)} preview={preview} />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Your meters</h2>
            <Link href={destination("/meters")}>Details</Link>
          </div>
          {meters.length ? (
            <div className="meter-summary">
              <span className="meter-symbol">
                <Gauge size={34} />
              </span>
              <Badge status={meters[0].status} />
              <h3>{meters[0].meter_number}</h3>
              <p>{meters[0].address ?? "Address not provided"}</p>
              <small>{meters[0].meter_type} meter</small>
            </div>
          ) : (
            <Empty title="No meter linked">
              Your provider will link a meter to your account.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
