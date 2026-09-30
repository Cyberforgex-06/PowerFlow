# PowerFlow

Electricity Bill Management System for matric number **23/SCI01/032**. One responsive Next.js + TypeScript application supports laptops and phones, with a dedicated Supabase backend.

## Implemented

- Email/password registration, login, confirmation, password recovery and sign-out.
- Server-validated sessions, protected customer routes and database-backed admin roles.
- Customer dashboard, bill filters and statements, print/save-PDF, meter details, consumption, payment history, notifications and profile editing.
- Admin customer meter assignment, tariff creation, and atomic reading/bill generation with customer notification and audit logging.
- Billing validates tariff dates, meter status/type, reading continuity and overlapping periods. Currency calculations use PostgreSQL decimal arithmetic; tax is a percentage of energy plus fixed charges.
- Row-level security isolates customer records; column permissions prevent role changes and notification content edits.
- Public `/preview` uses explicitly labelled sample data. No sample data is inserted into the real backend.

## Run locally

Use Node.js 24 LTS and npm.

```bash
npm ci
```

Copy `.env.example` to `.env.local` and set the publishable key from the **PowerFlow** project's Connect dialog. This app is linked to Supabase project `ebbuepdkmhxmkibatsha`; do not use the unrelated Supabase project.

```bash
npm run dev
```

Open http://localhost:3000. `/preview` shows the dashboard before you register.

Only the publishable key belongs in `NEXT_PUBLIC_` variables. This application does not need a service-role key.

## Supabase configuration

The `supabase/migrations` directory contains the existing project's three original migrations and the two follow-up migrations applied while building the application. Migration versions match the live project. Do not rerun these SQL files manually against the existing project.

In Supabase Auth → URL Configuration, set the Site URL to the deployed Render production origin, and add the exact allowed callback URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/reset-password
https://YOUR-PRODUCTION-DOMAIN/auth/callback
https://YOUR-PRODUCTION-DOMAIN/auth/callback?next=/reset-password
```

Keep email confirmation enabled. Configure an email provider before accepting public registrations at volume. Confirmations and password-reset links use the PKCE callback; they must be opened in the browser where the request was made.

All new accounts are customers. After your intended administrator registers and confirms their email, provision that account using the Supabase SQL editor with its verified user UUID:

```sql
update public.profiles set role = 'admin' where id = 'VERIFIED-ADMIN-USER-UUID';
```

The app provides no public route for selecting or granting admin roles.

## Deploy to Render

PowerFlow runs as a Node.js web service; its authentication and database remain in the dedicated Supabase project.

`render.yaml` defines a free web service in Frankfurt, Node.js 24, a reproducible build, port binding, a health check, and automatic deploys from `main`.

1. Push this code to `Cyberforgex-06/PowerFlow` on GitHub.
2. Create a Render Blueprint from that repository, or create a Node web service with the settings below.
3. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the PowerFlow project's publishable key before building.
4. After Render assigns the public URL, set Supabase's Site URL to that origin and allow its `/auth/callback` and `/auth/callback?next=/reset-password` URLs.

| Setting | Value |
| --- | --- |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm run start -- --hostname 0.0.0.0 --port $PORT` |
| Health check | `/api/health` |
| Node version | `24.19.0` |
| Supabase URL | `https://ebbuepdkmhxmkibatsha.supabase.co` |

The publishable key is available to the browser and protected by database policies. Never supply a Supabase service-role key as a public variable. Free Render services may sleep when idle; select a paid plan in Render if continuous availability is needed.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

In environments that block Turbopack worker ports, use `npm exec next build -- --webpack`. The standard build remains suitable for Render.

`tests/database-security.sql` tests real PostgreSQL policies and billing in a transaction that rolls back every fixture. Run it in the Supabase SQL editor on a test project with these migrations. It checks atomic billing, monetary calculations, overlaps, discontinuous readings, audit logging, customer/anonymous isolation, profile edits and privilege escalation.

GitHub Actions runs lint, type checking, unit tests and a production build. Add the non-secret repository variable `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable that build.

## Structure

```text
src/app/(auth)       Login, registration and recovery
src/app/(portal)     Protected customer and admin pages
src/app/auth         PKCE callback
src/app/preview      Explicit sample dashboard
src/components      Shared responsive UI
src/lib             Typed Supabase clients, auth, actions and formatting
src/proxy.ts        Session refresh with private cache headers
supabase/migrations Versioned live database schema
tests               Billing and database security checks
```

## Remaining work

Online payment checkout, payment-provider verification/webhooks and prepaid vending are not implemented. Payment history currently displays backend records; customers cannot mark bills paid. No real payment gateway has been simulated. Customer/admin browser flows with confirmed accounts and production email delivery still need verification after deployment.
