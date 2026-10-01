import type { ApiErrorShape } from "@/lib/types";

let csrfToken: string | null = null;

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
    body?.error?.message ?? "The request could not be completed.",
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

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch("/api/v1/auth/csrf", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  const body = (await response.json()) as { csrf_token: string };
  csrfToken = body.csrf_token;
  return csrfToken;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (["POST", "PATCH", "DELETE"].includes(method)) headers.set("X-CSRF-Token", await getCsrfToken());

  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await parseError(response);
    if (options.authRedirect !== false) navigateForStatus(error);
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function clearClientCsrf() { csrfToken = null; }
