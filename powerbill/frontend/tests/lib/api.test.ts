import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, clearClientCsrf, prepareAuthSession, ApiError } from "@/lib/api";

afterEach(() => { clearClientCsrf(); vi.unstubAllGlobals(); vi.useRealTimers(); });

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


describe("authentication recovery", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it("shares the warmup request and retries a gateway failure before sending a mutation", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("Gateway error", { status: 502 }))
      .mockResolvedValueOnce(json({ csrf_token: "ready" }))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const warmup = prepareAuthSession();
    const request = apiRequest("/api/v1/auth/register", { method: "POST", authRedirect: false });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(warmup).resolves.toBe("ready");
    await expect(request).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      "/api/v1/auth/csrf", "/api/v1/auth/csrf", "/api/v1/auth/register",
    ]);
  });

  it("refreshes an explicitly rejected CSRF token once", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ csrf_token: "expired" }))
      .mockResolvedValueOnce(json({ error: { code: "csrf_failed" } }, 403))
      .mockResolvedValueOnce(json({ csrf_token: "fresh" }))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/api/v1/auth/login", { method: "POST", authRedirect: false })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1].headers.get("X-CSRF-Token")).toBe("fresh");
  });

  it("never replays a mutation after an ambiguous gateway failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ csrf_token: "ready" }))
      .mockResolvedValueOnce(new Response("Gateway error", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/api/v1/auth/register", { method: "POST", authRedirect: false })).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
