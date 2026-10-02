# PowerBill Backend — Phase 2

Flask JSON API for the PowerBill Electricity Bill Management System.

## Architecture

- Application factory: `app.create_app()`
- API prefix: `/api/v1`
- Blueprints: `auth`, `public`, `me`, `staff`, `admin`
- SQLAlchemy ORM + PostgreSQL (Supabase database only; **not Supabase Auth**)
- Browser authentication: Flask signed session cookie, `HttpOnly`, `Secure` in production, `SameSite=Lax`, 30-minute absolute lifetime
- State-changing requests: `X-CSRF-Token` + strict `Origin` validation
- JSON-only error contract: `{ "error": { "code", "message", "fields"? } }`

## Dependencies and why

- **Flask 3.1.3** — JSON API / application factory / secure cookie session support.
- **Flask-SQLAlchemy 3.1.1** — Flask lifecycle integration around SQLAlchemy without hiding SQLAlchemy 2.0 queries.
- **SQLAlchemy 2.0.54** — parameterized ORM queries, transactions, constraints and `SELECT ... FOR UPDATE`.
- **bcrypt 5.0.0** — 12-round password hashing. Input is explicitly capped at 72 UTF-8 bytes.
- **psycopg 3.3.6** — current PostgreSQL driver for the Supabase connection.
- **Gunicorn 26.2.0** — production WSGI server on Render.
- **pytest 9.0.2** — backend test suite.

No CORS package is included because the browser is designed to use the Next.js same-origin `/api/*` rewrite.

## Local setup

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask --app 'app:create_app("development")' run --port 5000
```

The frontend should first call `GET /api/v1/auth/csrf`, then send the returned token as `X-CSRF-Token` on every POST/PATCH/DELETE request.

## Tests

```bash
pytest
```

The tests cover registration/login/lockout, CSRF, Origin checks, numeric edge cases, billing calculation, duplicate readings, tariff snapshots, role checks, IDOR, payment tampering, double payment, SQL-injection-shaped input, XSS-shaped text, security headers, audit entries, database constraints, and the overdue CLI.

## Production notes

Use the connection string copied from Supabase **Connect** and append `sslmode=require`. Render is IPv4-only, so for the deployed persistent Flask service use the Supabase **Shared Pooler / Session mode** (port 5432) unless the project has the IPv4 add-on. A typical shape is:

```text
postgresql+psycopg://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:5432/postgres?sslmode=require
```

Do not invent the pooler hostname; copy it from the Supabase Connect dialog.

`ProductionConfig` refuses startup when `SECRET_KEY` is missing/short or the database is not PostgreSQL. Never put the database password or Flask secret in a `NEXT_PUBLIC_*` variable.

Run the approved project `schema.sql` on Supabase; do not use `db.create_all()` in production. The test suite uses SQLite only for isolated tests.

Create the first admin with:

```bash
python scripts/create_admin.py
```

Persist overdue bills daily with:

```bash
flask --app 'app:create_app("production")' mark-overdue
```

## Schema note

The original `schema.sql` was not available while this phase was generated. See `schema_assumptions.md`. Reconcile the ORM column mappings against that SQL before the production database is initialized.
