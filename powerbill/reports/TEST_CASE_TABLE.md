# PowerBill Test-Case Table

**Status key**

- **PASS — verified here:** executed successfully in this sandbox using dependency-free logic/static checks.
- **READY — runtime blocked:** automated test is implemented, but this sandbox cannot install Flask/Vitest/Playwright npm packages, so the runtime result must be collected in network-enabled CI/local development.

## Functional

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Bill calculation: 6658 → 6842 kWh | 184.000 kWh; energy ₦15,297.76; subtotal ₦16,547.76; VAT ₦1,241.08; total ₦17,788.84 | Pure billing function produced the exact expected values | PASS — verified here |
| Reading lower than previous | Request rejected with `reading_too_low` | Pure billing function raised expected error | PASS — verified here |
| Consumption above 50,000 kWh | Request rejected for manual verification | Pure billing function raised `manual_verification_required` | PASS — verified here |
| One reading per meter/month | Second monthly reading returns conflict | Pytest case implemented | READY — runtime blocked |
| Reading creates bill atomically | Reading and bill are created together | Pytest case implemented | READY — runtime blocked |
| Tariff snapshot | Old bill remains unchanged after tariff edit | Pytest case implemented | READY — runtime blocked |
| Payment amount tampering | Browser-supplied amount is ignored; DB bill amount is charged | Pytest case implemented; source audit confirms amount is read from `bill.total_amount` | READY — runtime blocked |
| Double payment | Second payment returns conflict and only one payment exists | Pytest case implemented; source audit confirms row lock | READY — runtime blocked |
| Overdue CLI | Past-due unpaid bill becomes `overdue` | CLI pytest implemented | READY — runtime blocked |
| Public tariff list | Only active tariffs are returned | Endpoint/test path present | READY — runtime blocked |
| Public stats | Counts and on-time rate return JSON | Endpoint/test path present | READY — runtime blocked |

## Login / Registration

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Valid registration | Creates customer role only | Pytest implemented | READY — runtime blocked |
| Duplicate registration | Returns 409 | Pytest implemented | READY — runtime blocked |
| Weak password | Returns field validation error | Password helper rejects weak input | PASS — verified here |
| Password >72 UTF-8 bytes | Rejected before bcrypt | Helper correctly rejects multibyte >72-byte password | PASS — verified here |
| Unknown email login | Generic 401 | Pytest implemented | READY — runtime blocked |
| Wrong password login | Same generic 401 as unknown account | Pytest implemented | READY — runtime blocked |
| Five failed logins | Account locked for configured interval | Pytest implemented | READY — runtime blocked |
| Correct password while locked | Same generic login failure | Pytest implemented | READY — runtime blocked |
| Session fixation defense | Login rotates pre-login session/CSRF state | Pytest implemented | READY — runtime blocked |
| Logout method | GET rejected; POST requires CSRF | Pytest implemented | READY — runtime blocked |
| Open redirect | External `next` URL rejected/ignored | Safe-path helper rejects absolute/scheme-relative paths | PASS — verified here |

## Form validation

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Empty registration fields | Validation error with field names | Parametrized pytest implemented | READY — runtime blocked |
| NaN meter reading | Rejected | Numeric helper rejects non-finite value | PASS — verified here |
| Infinity meter reading | Rejected | Numeric helper rejects non-finite value | PASS — verified here |
| Negative meter reading | Rejected | Numeric helper rejects negative value | PASS — verified here |
| Huge numeric input | Rejected by maximum/manual verification rule | Helper/billing checks verified | PASS — verified here |
| Unsupported query parameter | 400 `invalid_filter` | Pytest implemented | READY — runtime blocked |
| Mobile meter input | Uses decimal input mode | RTL test implemented; source contains `inputMode="decimal"` | READY — runtime blocked |
| Registration password hints | Live hints change as requirements become valid | RTL test implemented | READY — runtime blocked |

## Security

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Missing CSRF token | State-changing request returns 403 | Pytest implemented | READY — runtime blocked |
| Invalid Origin | State-changing request returns 403 and is audited | Pytest implemented | READY — runtime blocked |
| Login rate limit | Excess attempts return 429 | Pytest implemented | READY — runtime blocked |
| SQL injection string in search | Treated only as data; query remains valid | Pytest implemented; static audit found no raw string SQL execution | READY — runtime blocked |
| XSS payload in complaint | Returned as JSON text; not executed | Pytest implemented; frontend audit found no `dangerouslySetInnerHTML` usage | READY — runtime blocked |
| Customer → staff endpoint | 403 | Role-matrix pytest implemented | READY — runtime blocked |
| Customer → admin endpoint | 403 | Role-matrix pytest implemented | READY — runtime blocked |
| Billing officer → admin endpoint | 403 | Role-matrix pytest implemented | READY — runtime blocked |
| Anonymous protected endpoints | 401 | Role-matrix pytest implemented | READY — runtime blocked |
| Admin uses staff endpoint | Allowed | Role-matrix pytest implemented | READY — runtime blocked |
| IDOR: read another customer's bill | 404 and audit event | Pytest implemented; source audit confirms ownership 404 logging | READY — runtime blocked |
| IDOR: pay another customer's bill | 404 and audit event | Pytest implemented | READY — runtime blocked |
| IDOR: get another customer's receipt | 404 and audit event | Pytest implemented | READY — runtime blocked |
| Secure cookie flags | HttpOnly + Secure + SameSite=Lax | Pytest implemented | READY — runtime blocked |
| Security headers | nosniff, DENY, Referrer-Policy, Permissions-Policy | Pytest + Playwright header tests implemented | READY — runtime blocked |
| HSTS in production | `max-age=31536000; includeSubDomains` | Pytest implemented | READY — runtime blocked |
| Authenticated response caching | `Cache-Control: no-store` | Pytest implemented/source audit confirms header logic | READY — runtime blocked |
| Next CSP nonce | Per-response nonce; no `unsafe-inline`; `frame-ancestors 'none'` | Playwright test implemented; proxy source audit passes | READY — runtime blocked |
| Browser token storage | No auth token in local/session storage | Static audit: no `localStorage`/`sessionStorage` token pattern | PASS — verified here |
| Payment row lock | `SELECT ... FOR UPDATE` | Static audit found `with_for_update()` | PASS — verified here |
| Audit login failure/access denial/payment | Required events stored | Pytests implemented | READY — runtime blocked |

## Usability

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Status badges | Paid/unpaid/overdue use distinct semantic treatment and readable labels | RTL table test implemented | READY — runtime blocked |
| Labels | Core auth/reading fields are label-addressable | RTL/E2E locators use visible labels | READY — runtime blocked |
| Focus indication | Keyboard focus visibly outlined | Static CSS audit finds global `:focus-visible` rule | PASS — verified here |
| Reduced motion | Animations collapse when requested | Static CSS audit finds `prefers-reduced-motion` handling | PASS — verified here |
| Touch layout | Mobile navigation is bottom-positioned with safe-area support | Responsive static audit passes | PASS — verified here |

## Responsive / Mobile

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| 390px E2E customer journey | No page-level horizontal scroll through full customer flow | Playwright project `phone-390` implemented | READY — runtime blocked |
| 768px E2E customer journey | Same flow works at tablet width | Playwright project `tablet-768` implemented | READY — runtime blocked |
| 1440px E2E customer journey | Same flow works at desktop width | Playwright project `desktop-1440` implemented | READY — runtime blocked |
| Public pages at all three widths | No page-level horizontal scroll | Playwright responsive suite implemented | READY — runtime blocked |
| Bills on phone | Table replaced by stacked cards | Static responsive audit passes | PASS — verified here |
| Desktop bills | Table visible from `md` upward | Static responsive audit passes | PASS — verified here |
| Safe-area support | Bottom nav clears notched-phone inset | Static CSS audit passes | PASS — verified here |
| `dvh` mobile viewport | Browser bars do not cut off app shell/system pages | Static audit confirms dynamic viewport units | PASS — verified here |
| Printable receipt | App chrome hidden and receipt print styles applied | Static CSS audit passes | PASS — verified here |

## Error handling

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| 403 page | Branded, readable, no horizontal overflow | Playwright system-page test implemented | READY — runtime blocked |
| 404 page | Branded, readable, no horizontal overflow | Playwright system-page test implemented | READY — runtime blocked |
| 429 page | Branded rate-limit message | Playwright system-page test implemented | READY — runtime blocked |
| 500 page | No stack trace exposed | Page and API generic error handler present; Playwright test implemented | READY — runtime blocked |
| Session expired | Clear re-login action | Playwright system-page test implemented | READY — runtime blocked |
| API error shape | `{error:{code,message,fields?}}` handled consistently | RTL/API test implemented | READY — runtime blocked |

## Database

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Invalid user role constraint | Database rejects role outside allowed set | Pytest implemented | READY — runtime blocked |
| Meter reading uniqueness | Duplicate meter/month blocked | Model constraint + endpoint pytest present | READY — runtime blocked |
| Payment uniqueness | One payment per bill | Model unique constraint + double-payment pytest present | READY — runtime blocked |
| Tariff numeric checks | Negative rate/fixed charge and invalid VAT rejected by DB | Model constraints present | READY — runtime blocked |
| Bill status constraint | Only unpaid/paid/overdue accepted | Model constraint present | READY — runtime blocked |
| Audit-log append-only trigger | UPDATE/DELETE blocked by supplied schema trigger | Cannot validate until original `schema.sql` is attached/applied | READY — schema dependency |
