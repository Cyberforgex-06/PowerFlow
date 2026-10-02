// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/v1/[...path]/route";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("same-origin API transport", () => {
  it("preserves sessions and CSRF without forwarding platform routing headers", async () => {
    vi.stubEnv("POWERBILL_API_ORIGIN", "https://backend.example");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { headers: {
      "Content-Type": "application/json", "Set-Cookie": "powerbill_session=new; Secure; HttpOnly; SameSite=Lax; Path=/",
    } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("https://app.example/api/v1/auth/login", {
      method: "POST", body: '{"email":"test@example.invalid"}', headers: {
        "Content-Type": "application/json", "Origin": "https://app.example", "X-CSRF-Token": "token",
        "Cookie": "platform_cookie=irrelevant; powerbill_session=old", "User-Agent": "Mozilla/5.0",
        "cf-worker": "onrender.com", "cdn-loop": "cloudflare", "render-proxy-ttl": "0",
        "x-forwarded-for": "192.0.2.1", "sec-fetch-site": "same-origin",
      },
    }));
    const [target, options] = fetchMock.mock.calls[0];
    expect(target.toString()).toBe("https://backend.example/api/v1/auth/login");
    expect(options.headers.get("cookie")).toBe("powerbill_session=old");
    expect(options.headers.get("origin")).toBe("https://app.example");
    expect(options.headers.get("x-csrf-token")).toBe("token");
    expect(options.headers.get("x-forwarded-for")).toBe("192.0.2.1");
    expect(options.headers.get("accept")).toBe("application/json");
    expect(options.headers.get("user-agent")).toBe("PowerBillFrontend/1.0");
    for (const name of ["cf-worker", "cdn-loop", "render-proxy-ttl", "sec-fetch-site"]) expect(options.headers.has(name)).toBe(false);
    expect(response.headers.getSetCookie()).toEqual(["powerbill_session=new; Secure; HttpOnly; SameSite=Lax; Path=/"]);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("keeps a cold-start request alive beyond the former 12-second timeout", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal;
    vi.stubGlobal("fetch", vi.fn((_url, options) => {
      signal = options.signal;
      return new Promise(resolve => setTimeout(() => resolve(Response.json({ csrf_token: "ready" })), 40000));
    }));
    const pending = GET(new Request("https://app.example/api/v1/auth/csrf"));
    await vi.advanceTimersByTimeAsync(40000);
    expect(signal!.aborted).toBe(false);
    expect(await (await pending).json()).toEqual({ csrf_token: "ready" });
  });

  it("returns a recoverable JSON error for a platform loading page without replaying a mutation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html>Starting</html>", { headers: { "Content-Type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("https://app.example/api/v1/auth/register", { method: "POST", body: "{}" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("service_unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves real authentication errors and query strings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: { code: "authentication_required" } }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new Request("https://app.example/api/v1/me/bills?page=2"));
    expect(response.status).toBe(401);
    expect(fetchMock.mock.calls[0][0].search).toBe("?page=2");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
