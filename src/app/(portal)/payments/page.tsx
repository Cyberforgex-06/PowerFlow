import { requireCustomer } from "@/lib/auth";
import { PageHeading, Empty, Badge } from "@/components/ui";
import { date, money } from "@/lib/format";
export default async function Payments() {
  const { client, user } = await requireCustomer();
  const { data, error } = await client
    .from("payments")
    .select("*")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load payments.");
  return (
    <>
      <PageHeading
        title="Payment history"
        description="Track the status of payments on your account."
      />
      <section className="panel">
        {data?.length ? (
          <div className="payment-list">
            {data.map((payment) => (
              <article className="payment-row" key={payment.id}>
                <div>
                  <strong>{payment.reference}</strong>
                  <span>
                    {date(payment.paid_at ?? payment.created_at)} ·{" "}
                    {payment.payment_method ?? "Payment method not provided"}
                  </span>
                </div>
                <div>
                  <strong>{money(payment.amount)}</strong>
                  <Badge status={payment.status} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="No payments yet">
            Your payment history will appear here when a payment is recorded.
          </Empty>
        )}
      </section>
    </>
  );
}
