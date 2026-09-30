export const money = (amount: number | null) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
export const month = (value: string) =>
  new Intl.DateTimeFormat("en-NG", {
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
