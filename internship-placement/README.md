# Placement — Internship Placement System

Minimalist responsive website and Flask API for students across all departments, employers, and administrators. This implementation is isolated under `internship-placement/` on the `internship-placement` branch of the existing repository. Existing PowerBill and PowerFlow deployment branches are unchanged.

## Current state

The Render deployment serves the interactive demo until a dedicated Supabase PostgreSQL database and email delivery are configured. Demo openings and companies are fictional. Demo changes stay in JavaScript memory and reset on refresh. The demo never submits credentials, CV files, or applications to the backend. Real registration returns an explicit service-unavailable response while configuration is missing.

Figma file creation succeeded, but the Starter-plan MCP limit prevented screen composition. The file is blank and is not a completed design deliverable. The implemented website contains the actual minimalist design.

## Features

- Landing page, placement search and department/work-mode filters; layouts for phones and laptops.
- Student/employer registration, email verification, sign-in, logout, password recovery, and 30-minute sessions.
- Student profile, secure PDF CV upload and authorised CV downloads.
- Saved placements, cover notes, duplicate-application prevention, application tracking, withdrawal, shortlist/accept/reject decisions and feedback.
- Employer profiles, company verification, listing creation, administrator approval and listing closure.
- Support tickets and administrator replies; audit history.
- Demonstration role switcher for exploring the complete workflow.

## Security

Passwords use bcrypt with 12 rounds. Only opaque session identifiers are stored in HttpOnly/Secure/SameSite=Lax cookies; hashed identifiers, expiration and CSRF values are stored in the database. Tokens are not stored in browser localStorage. Every mutating authenticated request requires a CSRF header and matching Origin. Server-side role and ownership checks protect employer listings, student applications and CVs. SQLAlchemy uses parameterised queries. Login lockout follows five failed attempts; auth endpoints also have a database-backed 15-minute rate window. Server output uses restrictive CSP/security headers. Dynamic frontend text is escaped before rendering.

Database tables use the `ips_` prefix. On PostgreSQL, `flask init-db` enables RLS, denies `anon`/`authenticated` access and installs a trigger preventing audit UPDATE/DELETE. The application accesses PostgreSQL through a private server credential; it does not expose application tables through the Supabase browser Data API. Database-owner administrators can bypass these controls and must protect their credentials. Dedicated database recommended; do not connect this application to the PowerBill or PowerFlow project.

## Enable live accounts

1. In Supabase, create a separate `Internship Placement System` project in **Cyberforgex-06's Org**, reviewing the plan/cost there. The connected MCP service did not offer project provisioning in this session.
2. Copy the transaction/session pooler connection string from the project's **Connect** panel. Configure it as `DATABASE_URL` in the new Render service's Environment tab; append `sslmode=require`. Never place credentials in GitHub or frontend code. Percent-encode special characters in the database password.
3. Set `PUBLIC_URL` to the exact new Render URL (no trailing slash), then set `BREVO_API_KEY` and `EMAIL_FROM` using a verified Brevo sender. Render Free blocks outbound SMTP ports; this application uses Brevo’s HTTPS API on that plan. Legacy SMTP configuration remains available for environments that permit it.
4. Run `flask --app app init-db` from this directory against the dedicated project. The provided Render `start.sh` does this automatically when DATABASE_URL is set. Redeploy the new Render service.
5. Register a new user and verify the email. For the first administrator, set `ADMIN_EMAIL` in a secure shell and run `flask --app app promote-admin`. Administrators cannot be created by public registration.
6. Verify registration/email delivery, recovery, company moderation, CV permissions and application decisions against the real project before inviting users. Run Supabase security advisors. Local tests verify HTTPS email request construction and rollback on provider failure; they do not establish production email/PostgreSQL behaviour.

## Local development and tests

Python 3.12+. Install `pip install -r requirements-lock.txt` and set DATABASE_URL to a local test database. Run `flask --app app init-db` and `flask --app app run`. For a read-only demo, leave DATABASE_URL unset. For tests: `pip install pytest==8.4.2` then `python -m pytest tests -q`. Tests use isolated in-memory SQLite, never the user's projects.

## Deployment

Render free Python web service, Frankfurt region. Build from repository root: `cd internship-placement && pip install -r requirements-lock.txt`. Start: `cd internship-placement && sh start.sh`. Health endpoint: `/api/health`. Database-free deployments are explicitly demo-only. Render free services may sleep and need time to wake.

## Validation and limits

11 backend integration tests passed; JavaScript syntax check passed. Desktop browser checks passed for landing-page rendering, search, saving, application submission, employer decisions, listing creation and administrator approval. Real phone/device layout verification remains outstanding. PostgreSQL RLS/audit-trigger behaviour and email delivery remain unverified until the dedicated database is provisioned. PDF validation checks header, trailer, size and permissions; this version does not include malware scanning. Listing/applicant/admin lists have a 200-record cap, support lists 100; pagination should be added before large-scale use. The demo is not a real placement service or a source of genuine vacancies.
