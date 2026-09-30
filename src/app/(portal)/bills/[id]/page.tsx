import { requireCustomer } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { money, date } from "@/lib/format";
import { billStatus } from "@/lib/billing";
import { PageHeading, Badge } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, user } = await requireCustomer();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: bill, error } = await client
    .from("bills")
    .select("*")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to load the bill.");
  if (!bill) notFound();
  const { data: meter, error: meterError } = await client
    .from("meters")
    .select("meter_number,address")
    .eq("id", bill.meter_id)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (meterError) throw new Error("Unable to load meter details.");
  return (
    <>
      <PageHeading title="Bill details" action={<PrintButton />} />
      <Link className="back-link" href="/bills">
        Back to all bills
      </Link>
      <article className="panel invoice">
        <div className="invoice-top">
          <div>
            <span className="eyebrow">ELECTRICITY STATEMENT</span>
            <h2>PowerFlow</h2>
            <p>Statement {bill.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <Badge status={billStatus(bill)} />
        </div>
        <div className="details-grid">
          <div>
            <small>Billing period</small>
            <strong>
              {date(bill.billing_period_start)} –{" "}
              {date(bill.billing_period_end)}
            </strong>
          </div>
          <div>
            <small>Payment due</small>
            <strong>{date(bill.due_date)}</strong>
          </div>
          <div>
            <small>Meter number</small>
            <strong>{meter?.meter_number ?? "Unavailable"}</strong>
          </div>
          <div>
            <small>Supply address</small>
            <strong>{meter?.address ?? "Not provided"}</strong>
          </div>
        </div>
        <dl className="charges">
          <div>
            <dt>Electricity consumed</dt>
            <dd>{bill.units_consumed} kWh</dd>
          </div>
          <div>
            <dt>Energy charge</dt>
            <dd>{money(bill.energy_charge)}</dd>
          </div>
          <div>
            <dt>Fixed charge</dt>
            <dd>{money(bill.fixed_charge)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{money(bill.tax_amount)}</dd>
          </div>
          <div className="total">
            <dt>Total bill</dt>
            <dd>{money(bill.total_amount)}</dd>
          </div>
        </dl>
        {["pending", "overdue"].includes(bill.status) && (
          <p className="notice">
            Online payment checkout is being connected. Contact your electricity
            provider for the available payment channels.
          </p>
        )}
        <Link className="button secondary" href="/payments">
          View payment history
        </Link>
      </article>
    </>
  );
}
