# PowerBill premium redesign

## Delivered

New forest-green, ivory, sage and citron visual design; self-hosted DM Serif Display and Manrope; desktop/mobile landing, visible sign-up and sign-in routes, working sample estimator and sample customer application.

The full Next frontend shares the design system and preserves its existing API contract, secure session/proxy logic, protected routes, role boundaries and validation. Added a dependency lockfile. Fixed Vitest JSX configuration, separated its unit suite from Playwright files, and corrected field-error ordering so the first validation issue is shown.

## Checks

- TypeScript and Next production build: PASS.
- Vitest: 13/13 PASS.
- Browser: homepage, register, login, dashboard, bills, readings and complaints at 390/768/1440 px: PASS, no document overflow.
- Sample estimator total ₦18,275 and decreasing-reading rejection: PASS.
- Sample reading 24,820 → 25,000 yields ₦10,750; simulated payment and receipt navigation: PASS.
- Complaint submission: PASS. No browser JavaScript exceptions.

## Limits

The Render static preview does not create accounts, accept payment or persist sample actions. Live activation still requires the separate PowerBill database connection. The backend fixtures now match the nine-table schema and isolate Flask request contexts correctly. All 66 backend tests pass, including persistent signup/sign-in, private dashboard access, role boundaries, and the production simulated-payment block. TypeScript and the Next production build pass. See LIVE_ACCOUNTS.md for activation configuration. No production schema changes were made.
