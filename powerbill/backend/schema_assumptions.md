# Schema reconciliation note

The requested `schema.sql` was not attached to the current conversation and was not found in the connected Library or GitHub account when Phase 2 was built.

The SQLAlchemy mappings therefore use only the nine tables and business/security fields explicitly required by the project brief:

- `users`
- `customer_profiles`
- `tariffs`
- `meters`
- `meter_readings`
- `bills`
- `payments`
- `complaints`
- `audit_logs`

Before production deployment, compare these mapped column names/types/constraints with the supplied `schema.sql`. The API/services are intentionally separated from the model definitions so this reconciliation is localized.

Do **not** create these tables with `db.create_all()` in production. Run the approved `schema.sql` against Supabase, then use the models only as ORM mappings.
