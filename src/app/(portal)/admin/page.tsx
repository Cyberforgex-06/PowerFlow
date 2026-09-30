import { requireAdmin } from "@/lib/auth";
import { PageHeading, Empty, Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createMeter, createTariff } from "@/lib/actions";
import { money, date } from "@/lib/format";
import { BillingForm } from "@/components/billing-form";
export default async function Admin() {
  const { client } = await requireAdmin();
  const [customers, meters, tariffs, bills, readings] = await Promise.all([
    client
      .from("profiles")
      .select("id,full_name,email")
      .eq("role", "customer")
      .order("full_name"),
    client.from("meters").select("*").order("created_at", { ascending: false }),
    client
      .from("tariffs")
      .select("*")
      .order("effective_from", { ascending: false }),
    client
      .from("bills")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("meter_readings")
      .select("*")
      .order("reading_date", { ascending: false }),
  ]);
  if (
    customers.error ||
    meters.error ||
    tariffs.error ||
    bills.error ||
    readings.error
  )
    throw new Error("Unable to load administration.");
  return (
    <>
      <PageHeading
        title="Administration"
        description="Manage customer meters and electricity tariffs."
      />
      <section className="stats-grid">
        <div className="stat-card">
          <span>Registered customers</span>
          <strong>{customers.data?.length ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span>Registered meters</span>
          <strong>{meters.data?.length ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span>Active tariffs</span>
          <strong>{tariffs.data?.filter((t) => t.active).length ?? 0}</strong>
        </div>
      </section>
      <div className="cards-grid">
        <section className="panel form-panel">
          <h2>Link a meter</h2>
          {customers.data?.length ? (
            <ActionForm action={createMeter} label="Add meter">
              <label>
                Customer
                <select name="customer_id" required>
                  <option value="">Select a customer</option>
                  {customers.data.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.full_name} · {c.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Meter number
                <input
                  name="meter_number"
                  minLength={5}
                  maxLength={40}
                  required
                />
              </label>
              <label>
                Meter type
                <select name="meter_type">
                  <option value="postpaid">Postpaid</option>
                  <option value="prepaid">Prepaid</option>
                </select>
              </label>
              <label>
                Supply address
                <input name="address" minLength={5} maxLength={300} required />
              </label>
            </ActionForm>
          ) : (
            <Empty title="No customers yet">
              A customer needs to register before you can assign a meter.
            </Empty>
          )}
        </section>
        <section className="panel form-panel">
          <h2>Create a tariff</h2>
          <ActionForm action={createTariff} label="Create tariff">
            <label>
              Tariff name
              <input name="name" minLength={2} maxLength={120} required />
            </label>
            <label>
              Rate per kWh (₦)
              <input
                name="rate_per_kwh"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <div className="form-columns">
              <label>
                Fixed charge (₦)
                <input
                  name="fixed_charge"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
              <label>
                Tax (%)
                <input
                  name="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
            </div>
            <label>
              Effective from
              <input name="effective_from" type="date" required />
            </label>
          </ActionForm>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Meter register</h2>
        </div>
        {meters.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Meter</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Latest reading</th>
                </tr>
              </thead>
              <tbody>
                {meters.data.map((m) => {
                  const reading = readings.data?.find(
                    (r) => r.meter_id === m.id,
                  );
                  return (
                    <tr key={m.id}>
                      <td>{m.meter_number}</td>
                      <td>
                        {customers.data?.find((c) => c.id === m.customer_id)
                          ?.full_name ?? "Customer"}
                      </td>
                      <td>
                        <Badge status={m.status} />
                      </td>
                      <td>
                        {reading
                          ? `${reading.current_reading} kWh · ${date(reading.reading_date)}`
                          : "No reading yet"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No meters yet">
            Link a meter to a registered customer.
          </Empty>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Recently issued bills</h2>
        </div>
        {bills.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.data.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {customers.data?.find((c) => c.id === b.customer_id)
                        ?.full_name ?? "Customer"}
                    </td>
                    <td>
                      {date(b.billing_period_start)} –{" "}
                      {date(b.billing_period_end)}
                    </td>
                    <td>{money(b.total_amount)}</td>
                    <td>
                      <Badge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No bills issued yet">
            Record a reading to create the first bill.
          </Empty>
        )}
      </section>
      <BillingForm meters={meters.data ?? []} tariffs={tariffs.data ?? []} />
      <section className="panel">
        <div className="panel-heading">
          <h2>Tariffs</h2>
        </div>
        {tariffs.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rate / kWh</th>
                  <th>Fixed charge</th>
                  <th>Tax</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tariffs.data.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{money(t.rate_per_kwh)}</td>
                    <td>{money(t.fixed_charge)}</td>
                    <td>{t.tax_rate}%</td>
                    <td>
                      <Badge status={t.active ? "active" : "inactive"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No tariffs yet">
            Create a tariff to prepare for billing.
          </Empty>
        )}
      </section>
    </>
  );
}
