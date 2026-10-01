# PowerBill Phase 2 API contract

Base prefix: `/api/v1`

## Public
- `GET /public/tariffs`
- `GET /public/stats`

## Authentication
- `GET /auth/csrf`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

## Customer
- `GET /me/dashboard`
- `GET /me/meters`
- `GET /me/bills?status&month&q&page`
- `GET /me/bills/{id}`
- `POST /me/bills/{id}/pay`
- `GET /me/bills/{id}/receipt`
- `POST /me/readings`
- `GET|POST /me/complaints`

## Billing officer (admin may also use staff endpoints)
- `GET /staff/stats`
- `GET|POST /staff/meters`
- `POST /staff/readings`
- `GET /staff/bills?q&status&month&page`
- `GET /staff/bills/{id}`
- `POST /staff/bills/{id}/pay`
- `GET /staff/complaints?status&page`
- `PATCH /staff/complaints/{id}`

## Admin
- `GET /admin/users?q&role&active&page`
- `PATCH /admin/users/{id}`
- `GET|POST|PATCH /admin/tariffs` (`PATCH` identifies the tariff with body field `id`)
- `GET /admin/audit?action&page`

## State-changing request contract

1. Call `GET /api/v1/auth/csrf`.
2. Keep the first-party Flask session cookie.
3. Send the returned token as `X-CSRF-Token` on every POST/PATCH/DELETE.
4. Browser `Origin` must exactly match a configured `ALLOWED_ORIGINS` value.

## Error contract

```json
{
  "error": {
    "code": "validation_error",
    "message": "Please correct the highlighted fields.",
    "fields": {
      "field": "Explanation"
    }
  }
}
```

## Security invariants

- Authentication/authorization never trusts a frontend-hidden button.
- Customer bill reads, payments and receipts perform ownership checks server-side.
- Foreign bill IDs intentionally return `404`, and the attempt is audited.
- Payment amount is always copied from `bills.total_amount` under a row lock.
- Query filters are explicit allowlists; search strings are escaped for LIKE semantics.
- No endpoint accepts or stores card details.
