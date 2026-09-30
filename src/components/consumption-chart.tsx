import { month } from "@/lib/format";
import { Empty } from "./ui";
export function ConsumptionChart({
  data,
}: {
  data: { period: string; units: number }[];
}) {
  if (!data.length)
    return (
      <Empty title="Your energy story starts here">
        Consumption will appear when your first meter reading is recorded.
      </Empty>
    );
  const grouped = new Map<string, number>();
  data.forEach((item) => {
    const key = item.period.slice(0, 7);
    grouped.set(key, (grouped.get(key) ?? 0) + item.units);
  });
  const series = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const max = Math.max(...series.map(([, units]) => units), 1);
  return (
    <div className="consumption-chart">
      <div className="chart-unit">kWh / month</div>
      <div className="chart-bars">
        {series.map(([period, units], i) => (
          <div className="chart-column" key={period}>
            <span className="bar-value">{units.toLocaleString("en-NG")}</span>
            <div
              className={`chart-bar ${i === series.length - 1 ? "latest" : ""}`}
              style={{ height: `${Math.max((units / max) * 150, 3)}px` }}
            />
            <span className="bar-label">{month(period + "-01")}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Monthly electricity consumption</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>kWh</th>
          </tr>
        </thead>
        <tbody>
          {series.map(([period, units]) => (
            <tr key={period}>
              <td>{month(period + "-01")}</td>
              <td>{units}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
