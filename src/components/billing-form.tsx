import type { Tables } from "@/lib/database.types";
import { ActionForm } from "./action-form";
import { issueBill } from "@/lib/actions";
import { Empty } from "./ui";
export function BillingForm({
  meters,
  tariffs,
}: {
  meters: Tables<"meters">[];
  tariffs: Tables<"tariffs">[];
}) {
  const eligible = meters.filter(
    (m) => m.status === "active" && m.meter_type === "postpaid",
  );
  const activeTariffs = tariffs.filter((t) => t.active);
  return (
    <section className="panel form-panel">
      <h2>Record a reading & issue a bill</h2>
      <p className="muted">
        Charges are calculated from the selected tariff. Tax is applied to the
        energy and fixed charges.
      </p>
      {eligible.length && activeTariffs.length ? (
        <ActionForm action={issueBill} label="Issue bill">
          <div className="form-columns">
            <label>
              Postpaid meter
              <select name="p_meter_id" required>
                <option value="">Select a meter</option>
                {eligible.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meter_number} · {m.address}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tariff
              <select name="p_tariff_id" required>
                <option value="">Select a tariff</option>
                {activeTariffs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · ₦{t.rate_per_kwh}/kWh
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-columns">
            <label>
              Previous reading (kWh)
              <input
                name="p_previous"
                type="number"
                min="0"
                step="0.01"
                required
              />
              <small>Use the last recorded meter reading.</small>
            </label>
            <label>
              Current reading (kWh)
              <input
                name="p_current"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </label>
          </div>
          <div className="form-columns">
            <label>
              Billing period starts
              <input name="p_start" type="date" required />
            </label>
            <label>
              Billing period ends
              <input name="p_end" type="date" required />
            </label>
          </div>
          <label>
            Payment due
            <input name="p_due" type="date" required />
          </label>
        </ActionForm>
      ) : (
        <Empty title="Prepare your billing details">
          Link an active postpaid meter and create a tariff before issuing a
          bill.
        </Empty>
      )}
    </section>
  );
}
