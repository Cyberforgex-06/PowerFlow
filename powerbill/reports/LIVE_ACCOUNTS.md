# Live account deployment

The Next.js frontend uses the Flask API through same-origin `/api` rewrites. Sign-up creates a persistent `users` record and `customer_profiles` record, always with the customer role. Customers sign in to open their private dashboard. New accounts show empty records until a billing officer assigns a meter.

## Required production configuration

Use the `powerbill-production` branch and the two services in `powerbill/render.yaml`. Do not change the separate PowerFlow service or database.

API environment:
- `FLASK_ENV=production`
- `SECRET_KEY`: generated random secret, minimum 32 characters.
- `DATABASE_URL`: PowerBill Supabase project `chaoztvqboagtwczfggv`, Connect → Session pooler URI with the database password and `sslmode=require`. Enter directly in Render; never commit or send in chat.
- `ALLOWED_ORIGINS`: exact HTTPS frontend origin, without trailing slash.

Frontend environment:
- `NODE_ENV=production`
- `POWERBILL_API_ORIGIN`: exact HTTPS API origin. This is used at build time as well as runtime; rebuild after changing it.

API startup rejects missing database configuration. `/health` checks database connectivity and returns 503 if unavailable. The frontend must not replace the static preview until registration, sign-in, account isolation, refresh, and sign-out pass against the deployed database.

## Payment scope

Production customer checkout is disabled until a verified payment integration exists. Customers cannot mark bills paid with the simulated endpoint. Billing officers can record verified offline payments using their protected workflow. Test/development retains simulated checkout for automated coverage.

## Activation check

After the database connection is configured, confirm API health, create a fresh customer through the frontend, sign in, confirm an empty dashboard, sign out and sign in again. Verify persistence in the database without printing password hashes. Remove only the explicitly created test records after verification. Do not seed test customers or sample bills into production.
