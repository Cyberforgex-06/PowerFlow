import "server-only";
import { backendFetch } from "@/lib/backend-fetch";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ApiErrorShape, Role, User } from "@/lib/types";


export class ServerApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const h = new Headers(init.headers);
  const cookieHeader = cookieStore.toString();
  if (cookieHeader) h.set("cookie", cookieHeader);
  h.set("accept", "application/json");
  const response = await backendFetch(path, { ...init, headers: h, cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorShape | null;
    throw new ServerApiError(response.status, body?.error.code ?? "request_failed", body?.error.message ?? "Request failed");
  }
  return (await response.json()) as T;
}

export async function safeServerApi<T>(path: string): Promise<T | null> {
  try { return await serverApi<T>(path); } catch { return null; }
}

export async function requireUser(roles?: Role[]) {
  try {
    const body = await serverApi<{ user: User }>("/api/v1/auth/me");
    if (roles && !roles.includes(body.user.role)) redirect("/403");
    return body.user;
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) redirect("/login");
    throw error;
  }
}
