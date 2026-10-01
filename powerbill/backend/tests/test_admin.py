from __future__ import annotations

from decimal import Decimal

from app.extensions import db
from app.models import AuditLog, User
from tests.conftest import login, patch, post


def test_admin_cannot_change_own_role(client, seeded):
    assert login(client, "admin@example.com").status_code == 200
    response = patch(client, f"/api/v1/admin/users/{seeded['admin']}", json={"role": "customer"})
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "self_role_change_forbidden"


def test_tariff_changes_are_audited_with_before_after(client, app, seeded):
    assert login(client, "admin@example.com").status_code == 200
    response = patch(client, "/api/v1/admin/tariffs", json={"id": seeded["tariff_id"], "rate_per_kwh": "84.25"})
    assert response.status_code == 200
    with app.app_context():
        event = db.session.query(AuditLog).filter_by(action="tariff_updated").order_by(AuditLog.id.desc()).first()
        assert event is not None
        assert Decimal(event.details["before"]["rate_per_kwh"]) == Decimal("83.1400")
        assert Decimal(event.details["after"]["rate_per_kwh"]) == Decimal("84.2500")
