import { requireCustomer } from "@/lib/auth";
import { PageHeading, Empty, Badge } from "@/components/ui";
import { Gauge } from "lucide-react";
export default async function Meters() {
  const { client, user } = await requireCustomer();
  const { data, error } = await client
    .from("meters")
    .select("*")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load meters.");
  return (
    <>
      <PageHeading
        title="My meters"
        description="The meters connected to your electricity account."
      />
      {data?.length ? (
        <div className="cards-grid">
          {data.map((meter) => (
            <article className="panel meter-card" key={meter.id}>
              <div className="panel-heading">
                <Gauge size={28} />
                <Badge status={meter.status} />
              </div>
              <h2>{meter.meter_number}</h2>
              <p className="muted">{meter.address ?? "Address not provided"}</p>
              <dl className="charges">
                <div>
                  <dt>Meter type</dt>
                  <dd>{meter.meter_type}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty title="No meters linked yet">
            Your provider needs to assign a meter to your account. Contact them
            with the email you used to register.
          </Empty>
        </section>
      )}
    </>
  );
}
