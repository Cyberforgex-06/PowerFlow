import type { ApiErrorShape } from "@/lib/types";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let wakeOrigin: string | null = null;
let sessionPreparedAt = 0;

// Render's sleeping API is not reliably activated by requests from another
// free Render service. A credential-free browser health request activates it.
async function wakeBackend() {
  if (!wakeOrigin) return;
  try {
    await fetch(`${wakeOrigin}/health`, {
      mode: "no-cors", credentials: "omit", cache: "no-store",
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(65000),
    });
  } catch { /* The same-origin CSRF request confirms readiness and reports errors. */ }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = RequestInit & { authRedirect?: boolean };

async function parseError(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiErrorShape | null;
  return new ApiError(
    response.status,
    body?.error?.code ?? "request_failed",
    body?.error?.message ?? (response.status >= 500 ? "The service is temporarily unavailable. Please try again shortly. If you were creating an account, try signing in before submitting again." : "The request could not be completed."),
    body?.error?.fields,
  );
}

function navigateForStatus(error: ApiError) {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}`;
  if (error.status === 401) window.location.assign(`/session-expired?next=${encodeURIComponent(next)}`);
  if (error.status === 403) window.location.assign("/403");
  if (error.status === 429) window.location.assign(`/429?next=${encodeURIComponent(next)}`);
}

// Retry only this read-only request: a sleeping backend can return a gateway page.
// Never automatically replay signup, payments, or other mutations after a 5xx.
async function loadCsrfToken(): Promise<string> {
  await wakeBackend();
  const deadline = Date.now() + 90000;
  for (let attempt = 0; attempt < 20 && Date.now() < deadline; attempt++) {
    try {
      const response = await fetch("/api/v1/auth/csrf", {
        credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(75000),
      });
      if (response.ok) {
        const body = await response.json().catch(() => null);
        if (typeof body?.csrf_token === "string" && body.csrf_token) {
          csrfToken = body.csrf_token;
          sessionPreparedAt = Date.now();
          return body.csrf_token;
        }
      } else if (![502, 503, 504].includes(response.status)) {
        throw await parseError(response);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
    }
    if (attempt < 19 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, Math.min(2000 * 2 ** attempt, 10000)));
  }
  throw new ApiError(503, "service_unavailable", "The sign-in service is taking longer to respond. Please try again in a moment.");
}

export async function prepareAuthSession(apiOrigin?: string): Promise<string> {
  if (apiOrigin) {
    const url = new URL(apiOrigin);
    if (url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") wakeOrigin = url.origin;
  }
  if (csrfToken && Date.now() - sessionPreparedAt > 10 * 60 * 1000) csrfToken = null;
  if (csrfToken) return csrfToken;
  if (!csrfRequest) csrfRequest = loadCsrfToken().finally(() => { csrfRequest = null; });
  return csrfRequest;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (["POST", "PATCH", "DELETE"].includes(method)) headers.set("X-CSRF-Token", await prepareAuthSession());

  const send = () => fetch(path, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal ?? AbortSignal.timeout(20000),
  }).catch(() => {
    throw new ApiError(503, "connection_failed", "The connection was interrupted. Please try again shortly. If you were creating an account, try signing in first.");
  });
  let response = await send();
  if (response.status === 403) {
    const body = await response.clone().json().catch(() => null);
    if (body?.error?.code === "csrf_failed") {
      clearClientCsrf();
      headers.set("X-CSRF-Token", await prepareAuthSession());
      response = await send();
    }
  }
  if (!response.ok) {
    const error = await parseError(response);
    if (options.authRedirect !== false) navigateForStatus(error);
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function clearClientCsrf() { csrfToken = null; }
