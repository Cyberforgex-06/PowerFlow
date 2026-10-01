# PowerBill Deployment Guide

## Architecture

- Frontend: Next.js 16 / React 19.
- API: Flask + Gunicorn on Render.
- Database: PostgreSQL on Supabase. Supabase Auth is not used.
- Browser traffic remains same-origin: `/api/*` is rewritten by Next.js to the Flask service.

## Supabase

1. Use the dedicated PowerBill Supabase project, not the PowerFlow database.
2. Run `backend/schema.sql` on a fresh database if the nine tables do not already exist.
3. Keep RLS enabled. The browser receives no Supabase key and has no direct database access.
4. The Render service requires the Supabase **Shared Pooler / Session mode** connection string on port 5432 when Render is IPv4-only.
5. Add `?sslmode=require` (or `sslmode=verify-full` with the Supabase CA installed).

## Render backend

Build command:

```bash
cd powerbill/backend && pip install -r requirements.txt
```

Start command:

```bash
cd powerbill/backend && gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 60
```

Required environment variables:

- `FLASK_ENV=production`
- `DATABASE_URL=<Supabase session-pooler connection string>`
- `SECRET_KEY=<at least 32 random characters>`
- `ALLOWED_ORIGINS=https://<frontend-host>`
- `COOKIE_SECURE=true`

The `/health` endpoint is intentionally database-independent. Verify database-backed health by requesting `/api/v1/public/tariffs` after deployment.

## Daily overdue cron

Run once daily:

```bash
cd powerbill/backend && flask --app wsgi:app mark-overdue
```

Use the same `FLASK_ENV`, `DATABASE_URL`, `SECRET_KEY`, and `ALLOWED_ORIGINS` variables as the API service.

## Vercel frontend

Root directory: `powerbill/frontend`.

Required environment variables:

- `POWERBILL_API_ORIGIN=https://<render-api-host>`
- `POWERBILL_PRODUCTION_HOST=<production frontend hostname>`

The configured rewrite makes browser requests to `/api/*` appear first-party. Do not expose a database URL or Flask secret through a `NEXT_PUBLIC_*` variable.

## First admin

With production environment variables loaded:

```bash
cd powerbill/backend
python scripts/create_admin.py
```

After login, the admin can promote a user to billing officer. The API prevents admins from changing their own role.

## Go-live checklist

- [ ] `/health` returns `{ "ok": true }`.
- [ ] `/api/v1/public/tariffs` returns active tariffs.
- [ ] Registration/login cookie is `HttpOnly; Secure; SameSite=Lax`.
- [ ] POST without `X-CSRF-Token` returns 403.
- [ ] Wrong Origin returns 403.
- [ ] Customer cannot open staff/admin routes.
- [ ] Customer A cannot read/pay Customer B's bill.
- [ ] CSP contains a per-request nonce and `frame-ancestors 'none'`.
- [ ] HSTS is present in production.
- [ ] `mark-overdue` cron is scheduled daily.
- [ ] Supabase backups and database monitoring are enabled for the chosen plan.
