# PowerBill

PowerBill is a university final-year Electricity Bill Management System focused on web application security, testing, deployment and review.

## Repository layout

- `frontend/` — Next.js 16 + React 19 + TypeScript + Tailwind CSS 4.
- `backend/` — Flask JSON API + SQLAlchemy for PostgreSQL/Supabase.

The browser communicates only with the Next.js origin. Next.js rewrites `/api/*` to Flask. Authentication is implemented by Flask with an HttpOnly session cookie; Supabase is used as plain PostgreSQL only, not Supabase Auth.

## Current project phase

Phase 1: Figma design completed.

Phase 2: Flask API source and backend tests written. The original user-supplied `schema.sql` was not available in the conversation/library during implementation, so backend ORM mappings must still be reconciled against that file before database setup.

Phase 3: Next.js frontend implemented against the Phase 2 API contract. See `frontend/PHASE3_STATUS.md` for validation status and API gaps discovered during integration.

Phase 4 testing and Phase 5 deployment/documentation are intentionally not executed yet.
