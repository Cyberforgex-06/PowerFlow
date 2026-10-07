import { backendFetch } from "@/lib/backend-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unavailable() {
  return Response.json({ error: { code: "service_unavailable", message: "We couldn’t connect to your account. Please try again shortly." } }, {
    status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3" },
  });
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const headers = new Headers();
  // Preserve the browser's Origin and CSRF token so Flask performs its normal checks.
  // Do not forward CDN routing headers, browser fetch metadata, or platform cookies.
  for (const name of ["content-type", "origin", "x-csrf-token", "x-forwarded-for"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const session = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith("powerbill_session="));
  if (session) headers.set("cookie", session);
  try {
    const upstream = await backendFetch(url.pathname + url.search, {
      method: request.method, headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
    });
    if (upstream.status !== 204 && !upstream.headers.get("content-type")?.includes("application/json")) {
      console.warn("API upstream non-JSON response", request.method, url.pathname, upstream.status);
      await upstream.body?.cancel();
      return unavailable();
    }
    const output = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["content-type", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) output.set(name, value);
    }
    // Multiple cookies must remain separate; preserve HttpOnly/Secure/SameSite attributes.
    for (const cookie of upstream.headers.getSetCookie()) output.append("set-cookie", cookie);
    return new Response(upstream.body, { status: upstream.status, headers: output });
  } catch {
    console.warn("API upstream connection failed", request.method, url.pathname);
    return unavailable();
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
