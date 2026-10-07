# PowerBill Frontend — Phase 3

Next.js 16 App Router frontend for the PowerBill electricity bill management system.

## Stack

- Next.js 16.3.7 — App Router, Server Components, `proxy.ts`, external rewrites.
- React 19.3.0 — interactive client components only where needed.
- TypeScript strict mode — shared API response types live in `lib/types.ts`.
- Tailwind CSS 4.3.3 — CSS-first `@theme` design tokens in `app/globals.css`.
- Lucide React — the only icon library, with a consistent 1.8 stroke weight.
- Zod — client-side usability validation for authentication and input forms; Flask remains authoritative.

No authentication package is used. Authentication belongs to the Flask API.

## Request architecture

Browser requests go to `/api/v1/*` on the Next.js origin. A Node route handler forwards `/api/v1/*` to the Flask origin in `POWERBILL_API_ORIGIN`, filtering platform headers, so the Flask session cookie remains first-party from the browser's point of view.

- Client mutations use `lib/api.ts`.
- `lib/api.ts` obtains `GET /api/v1/auth/csrf` and keeps the token in memory only.
- POST/PATCH/DELETE requests include `X-CSRF-Token`.
- No token is written to `localStorage` or `sessionStorage`.
- Server Components use `lib/server-api.ts`, which forwards the incoming cookie to Flask.
- `proxy.ts` checks only for the presence of `powerbill_session` to smooth anonymous navigation. Flask authorizes every real API request.

## Strict CSP

`proxy.ts` generates a fresh nonce on each page request and sets a strict Content-Security-Policy with `frame-ancestors 'none'`. Because nonce CSP requires request-time rendering, the root layout calls `connection()`.

## Routes

Public: `/`, `/security`, `/login`, `/register`.

Customer: `/dashboard`, `/bills`, `/bills/[id]`, `/receipts/[id]`, `/submit-reading`, `/complaints`, `/complaints/new`.

Billing officer: `/staff`, `/staff/meters`, `/staff/meters/assign`, `/staff/readings/new`, `/staff/bills`, `/staff/bills/[id]`, `/staff/complaints`, `/staff/complaints/[id]`.

Admin: `/admin/users`, `/admin/tariffs`, `/admin/audit`.

System: `/403`, `/429`, `/500`, `/session-expired`, plus the global 404 page.

## Run locally

1. Start Flask on `http://127.0.0.1:5000`.
2. Copy `.env.example` to `.env.local`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

The Flask development configuration must include `http://localhost:3000` in `ALLOWED_ORIGINS` and normally sets `COOKIE_SECURE=false` for local HTTP development.

## Responsive implementation

Base styles target phone layouts, with `md:` and `lg:` enhancement. Wide tables become cards on phones, application navigation becomes a bottom bar below 1024px, authenticated pages use `dvh`, the bottom bar respects safe-area insets, and receipts include a print stylesheet.

## Phase 2 API gaps exposed while wiring Phase 3

The fixed Phase 2 endpoint list does not provide a billing-officer customer search/list endpoint. `POST /staff/meters` requires a `customer_id`, so the current Assign Meter form accepts a customer UUID instead of pretending it can offer a searchable customer selector.

There is also no `GET /staff/complaints/{id}` endpoint. The response page therefore searches a bounded set of complaint-list pages to locate the selected complaint. A dedicated detail endpoint would be preferable before production.

Bill serializers expose `meter_id` but not `meter_number`, so some bill views cannot show a friendly meter number without additional lookups.

The auth page sends a credential-free browser request to the API `/health` endpoint before acquiring its first-party CSRF token. This activates an idle free Render backend. The CSP allows only the configured API origin for this request. The initial connection can still take about a minute on free hosting.
