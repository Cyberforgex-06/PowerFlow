from __future__ import annotations

import os
import sys
from decimal import Decimal
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

os.environ.setdefault("ALLOWED_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000")

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import Tariff, User  # noqa: E402
from app.security import hash_password  # noqa: E402

app = create_app("testing")
# Playwright reaches Flask only through Next.js, whose browser-facing origin is :3000.
app.config["ALLOWED_ORIGINS"] = {"http://127.0.0.1:3000", "http://localhost:3000"}

with app.app_context():
    db.create_all()
    if not db.session.query(Tariff).first():
        db.session.add(Tariff(name="Residential R2", rate_per_kwh=Decimal("83.1400"), fixed_charge=Decimal("1250.00"), vat_percent=Decimal("7.500"), is_active=True))
    for email, name, role in [
        ("officer@example.com", "E2E Billing Officer", "billing_officer"),
        ("admin@example.com", "E2E Admin", "admin"),
    ]:
        if not db.session.query(User).filter_by(email=email).first():
            db.session.add(User(email=email, full_name=name, password_hash=hash_password("StrongPass123"), role=role))
    db.session.commit()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
