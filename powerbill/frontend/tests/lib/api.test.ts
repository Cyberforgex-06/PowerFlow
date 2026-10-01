import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, clearClientCsrf, ApiError } from "@/lib/api";

afterEach(() => { clearClientCsrf(); vi.unstubAllGlobals(); });

describe("apiRequest", () => {
  it("adds CSRF to state-changing requests and keeps credentials same-origin", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: "csrf-123" }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest("/api/v1/example", { method: "POST", body: JSON.stringify({ x: 1 }) });
    const mutation = fetchMock.mock.calls[1];
    const options = mutation[1] as RequestInit;
    const headers = options.headers as Headers;
    expect(headers.get("X-CSRF-Token")).toBe("csrf-123");
    expect(options.credentials).toBe("same-origin");
    expect(options.cache).toBe("no-store");
  });

  it("throws the consistent API error shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "validation_error", message: "Bad input", fields: { reading: "Required" } } }), { status: 400, headers: { "Content-Type": "application/json" } })));
    await expect(apiRequest("/api/v1/example", { authRedirect: false })).rejects.toMatchObject<Partial<ApiError>>({ status: 400, code: "validation_error", message: "Bad input", fields: { reading: "Required" } });
  });
});
