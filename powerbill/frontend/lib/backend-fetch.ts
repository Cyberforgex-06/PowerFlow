/** Server-side transport. Never forward Render/Cloudflare routing headers to a second service. */
export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const origin = (process.env.POWERBILL_API_ORIGIN ?? "http://127.0.0.1:5000").replace(/\/$/, "");
  const target = new URL(origin);
  const requested = new URL(path, "http://powerbill.local");
  if (!requested.pathname.startsWith("/api/v1/")) throw new Error("Invalid API path");
  target.pathname = requested.pathname;
  target.search = requested.search;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("User-Agent", "PowerBillFrontend/1.0");
  // A cold free service can take a minute to start. Keep the request alive.
  return fetch(target, { ...init, headers, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(65000) });
}
