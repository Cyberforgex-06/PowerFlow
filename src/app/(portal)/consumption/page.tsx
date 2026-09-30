import { requireCustomer } from "@/lib/auth";
import { PageHeading, Empty } from "@/components/ui";
import { ConsumptionChart } from "@/components/consumption-chart";
import { date } from "@/lib/format";
export default async function Consumption() {
  const { client, user } = await requireCustomer();
  const { data: meters, error: metersError } = await client
    .from("meters")
    .select("id,meter_number")
    .eq("customer_id", user.id);
  if (metersError) throw new Error("Unable to load meters.");
  const { data, error } = meters?.length
    ? await client
        .from("meter_readings")
        .select("*")
        .in(
          "meter_id",
          meters.map((m) => m.id),
        )
        .order("reading_date", { ascending: false })
    : { data: [], error: null };
  if (error) throw new Error("Unable to load readings.");
  return (
    <>
      <PageHeading
        title="Consumption"
        description="See how your electricity use changes over time."
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>Monthly consumption</h2>
          <span>kWh</span>
        </div>
        <ConsumptionChart
          data={(data ?? []).map((r) => ({
            period: r.reading_date,
            units: r.units_consumed ?? 0,
          }))}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Meter readings</h2>
        </div>
        {data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meter</th>
                  <th>Previous</th>
                  <th>Current</th>
                  <th>Consumed</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td>{date(r.reading_date)}</td>
                    <td>
                      {meters?.find((m) => m.id === r.meter_id)?.meter_number}
                    </td>
                    <td>{r.previous_reading} kWh</td>
                    <td>{r.current_reading} kWh</td>
                    <td>{r.units_consumed} kWh</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No readings yet">
            Your provider will record readings for your meter.
          </Empty>
        )}
      </section>
    </>
  );
}
