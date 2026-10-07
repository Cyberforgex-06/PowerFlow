const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 });

export function formatNaira(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? naira.format(n).replace("NGN", "₦") : "₦0.00";
}

export function formatKwh(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return `${Number.isFinite(n) ? integer.format(n) : "0"} kWh`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function monthLabel(value: string) {
  const d = new Date(`${value.slice(0, 7)}-01T00:00:00`);
  return new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(d);
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
