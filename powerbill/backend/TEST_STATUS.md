# Phase 2 test status

## Completed in this build environment

- Python syntax compilation (`python -m compileall`) — **PASS**
- AST parse of every Python source file — **PASS**
- Core billing calculation executed directly from `app/services/billing.py` — **PASS**
  - 184.000 kWh
  - energy charge ₦15,297.76
  - subtotal ₦16,547.76
  - VAT ₦1,241.08
  - total ₦17,788.84
  - lower reading rejection — PASS
  - >50,000 kWh manual verification rejection — PASS
- Validation helpers executed directly from `app/utils.py` — **PASS**
  - NaN / Infinity / negative / huge numeric input rejected
  - unsafe absolute, protocol-relative, backslash and CRLF redirect paths rejected
  - password policy checks exercised

## Pytest suite written

26 tests are present covering:

- registration, duplicate account and password rules
- generic login failure, lockout, rate limiting and session creation
- CSRF token and Origin enforcement
- POST-only logout
- Decimal bill calculation and tariff snapshotting
- duplicate/lower/huge reading rules
- NaN, Infinity, negative and oversized numbers
- payment tampering and double payment
- SQL-injection-shaped search strings
- XSS-shaped input remaining JSON text
- security headers and cookie flags
- role access for customer / billing officer / admin
- IDOR for read / pay / receipt
- admin self-role protection
- tariff before/after audit entries
- overdue CLI
- database role constraint

## Environment limitation

The sandbox does not have Flask, Flask-SQLAlchemy or bcrypt installed and has no outbound package-network access, so the full HTTP pytest suite could not be executed here. `pip install -r requirements.txt` failed because DNS/network access is disabled in the execution environment.

Run in a normal environment with network access:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
pytest
```

Do not treat the 26 tests as passing until that command has actually completed successfully.
