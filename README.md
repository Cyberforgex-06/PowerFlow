# PowerBill

This branch is dedicated to PowerBill. The separate PowerFlow main branch is not part of this redesign.

## Current deliverables

- `powerbill-preview/`: responsive, interactive UI preview published by the existing Render static service. Includes landing page, estimator, registration/sign-in design previews, and customer demo screens for meters, readings, bills, payments, receipts, complaints and settings. Demo state is memory-only. No credentials are stored or submitted and no money is collected.
- `powerbill/frontend/`: Next.js application with the same visual direction, existing Flask API clients, role-aware application routes and real auth submission logic.
- `powerbill/backend/`: the supplied Flask application and SQL schema, retained without production schema changes.

The older root archive is historical. The editable `powerbill/` directory is the source for further application changes.

## Verification

- Frontend TypeScript: passed.
- Production Next build: passed.
- Frontend unit/component tests: 13 passed.
- Preview browser checks: 7 routes at 390, 768 and 1440 pixels, no document overflow.
- Preview functional checks: estimator (including invalid reading), reading → bill → simulated payment → receipt, complaint submission, zero JavaScript errors.
- Backend suite: not passing. Existing fixtures pass `opening_reading` to the current `Meter` model, which exposes it as a read-only property derived from readings. The fixture/model mismatch must be reconciled before treating backend tests as a deployment gate.

## Live account access

The public Render URL remains an explicitly labeled UI preview. It is not a production billing service. The Flask application still needs the PowerBill-specific PostgreSQL connection string configured securely on Render, and backend verification before enabling real accounts. Do not point the production backend at the separate PowerFlow database.

## Local development

Frontend: `cd powerbill/frontend && npm ci && npm run dev`.
Backend: see `powerbill/backend/README.md`.
Preview: `python -m http.server 8080 --directory powerbill-preview`.

Font assets are self-hosted; license files are alongside them. There are no external font requests.
