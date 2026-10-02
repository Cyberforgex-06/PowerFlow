# PowerBill Phase 4 — Testing Status

## Implemented

- Backend pytest suite expanded to cover authentication, registration, lockout, rate limiting, numeric edge cases, billing/rounding, duplicate reading, tariff snapshots, SQL-injection strings, XSS payloads, CSRF/Origin enforcement, security headers, secure cookies, HSTS, audit events, role matrices, IDOR read/pay/receipt, payment tampering, double payment and overdue CLI behavior.
- Frontend Vitest + React Testing Library tests for registration/password hints, login validation/error handling, status badges, meter-reading validation and the typed API/CSRF wrapper.
- Playwright configuration with **390px**, **768px** and **1440px** projects.
- Real-stack Playwright flow: register → login → staff assigns meter → customer submits reading → bill → payment → receipt.
- Playwright authorization test: customer blocked from staff/admin pages.
- Playwright error-page and horizontal-overflow checks.
- Playwright nonce-CSP/security-header check.
- Manual responsive checklist and report-ready grouped test-case table.

## Verified in this sandbox

- Python source compilation: **PASS**.
- TypeScript/TSX syntax transpilation: **99 files, 0 diagnostics**.
- Backend pure billing/validation logic checks: **PASS**.
- Frontend currency/kWh/date formatting checks: **PASS**.
- Static security audit: **14/14 PASS**.
- Responsive/route static audit: **37/37 PASS**.
- Test inventory: **39 backend pytest functions**, **10 Vitest/RTL declarations**, **4 Playwright declarations**. Parametrized suites execute more individual cases than these declaration counts.

## Runtime execution limitation

The container has no outbound package-network resolution. `pip install -r backend/requirements.txt` cannot download Flask/bcrypt, and `npm install` cannot download Next/Vitest/Playwright dependencies. Consequently:

- `pytest`: collection stops because `flask` is unavailable.
- `vitest`: command unavailable because npm dependencies are not installed.
- `@playwright/test`: npm test runner is unavailable. A separate Python Playwright CLI exists in the environment, but it is not the project's JavaScript Playwright Test dependency and is not substituted for it.

These are marked **environment-blocked**, not passing or failing application tests.

## Run the complete Phase 4 suite in a network-enabled environment

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
pytest
```

### Frontend unit/component tests

```bash
cd frontend
npm install
npm run typecheck
npm test
```

### Full responsive E2E

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

The Playwright config starts the testing Flask server and the Next.js dev server automatically. Do not point this E2E seed server at production data.

## Known prerequisite still outstanding

The original `schema.sql` referenced in the project brief has not been supplied in the accessible conversation/files. The ORM and tests use the nine-table contract stated in the brief. Database-trigger validation for the append-only `audit_logs` table must be repeated against the real SQL schema before Phase 5 go-live.
