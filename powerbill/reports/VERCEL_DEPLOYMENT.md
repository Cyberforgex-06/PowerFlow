# PowerBill Vercel deployment

Target account: cyberforgex-06s-projects (team_xx7UQxF2XFVL4faDE0CKbNqn).
Repository: Cyberforgex-06/PowerFlow. Branch: powerbill-production.

Create two projects from this branch, using these root directories:

| Project | Root directory | Framework |
| --- | --- | --- |
| powerbill-api | powerbill/backend | Flask |
| powerbill | powerbill/frontend | Next.js |

The backend main.py exports the same production Flask application as wsgi.py. Vercel handles execution; no Gunicorn start command is needed. Both projects use London, near the existing Supabase database.

Backend production environment:
- DATABASE_URL: the PowerBill Supabase session-pooler URI (project chaoztvqboagtwczfggv), with the password supplied directly in Vercel and sslmode=require. Never put the value in Git or chat.
- SECRET_KEY: securely generated, at least 32 characters. Keep stable between deployments.
- ALLOWED_ORIGINS: exact HTTPS production frontend origin without trailing slash.
- FLASK_ENV: production.

Frontend production environment:
- POWERBILL_API_ORIGIN: exact HTTPS production backend origin. Required at build time for same-origin API rewrites and at runtime for server rendering. Rebuild after changing it.

Use production aliases for API wiring; protected preview URLs require separate authenticated integration. Keep deployment protection enabled for previews. Customer signup always creates a customer, and simulated customer payments remain disabled in production.

Activation gate: backend /health returns 200; frontend registration and login work; a new user sees their own empty dashboard; sign-out blocks private access; sign-in after reload preserves the account. Do not migrate public traffic or remove Render services before this passes.

Current blocker: Vercel connector reads teams/projects successfully but deploy_to_vercel returns tool not found. CLI authentication is unavailable in this workspace. Browser fallback requires user approval under the browser-access rules. Database credentials are also still missing.
