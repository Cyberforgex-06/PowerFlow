from __future__ import annotations

from app.extensions import db
from app.models import AuditLog
from tests.conftest import ORIGIN, login, post


def _bill_for(client, meter_id):
    return post(client, "/api/v1/me/readings", json={"meter_id": meter_id, "reading": "1100"}).get_json()["bill"]


def test_customer_blocked_from_staff_and_admin(client, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    assert client.get("/api/v1/staff/stats", base_url=ORIGIN).status_code == 403
    assert client.get("/api/v1/admin/users", base_url=ORIGIN).status_code == 403


def test_idor_read_pay_receipt_all_404(client, app, seeded):
    # Customer B creates a bill.
    assert login(client, "musa@example.com").status_code == 200
    bill = _bill_for(client, seeded["meter_b"])
    post(client, "/api/v1/auth/logout", json={})

    # Customer A must not learn whether B's bill exists.
    assert login(client, "adaeze@example.com").status_code == 200
    assert client.get(f"/api/v1/me/bills/{bill['id']}", base_url=ORIGIN).status_code == 404
    assert post(client, f"/api/v1/me/bills/{bill['id']}/pay", json={"method": "simulated"}).status_code == 404
    assert client.get(f"/api/v1/me/bills/{bill['id']}/receipt", base_url=ORIGIN).status_code == 404
    with app.app_context():
        assert db.session.query(AuditLog).filter_by(action="idor_bill_denied").count() >= 3


def test_billing_officer_access_and_admin_access(client, seeded):
    assert login(client, "officer@example.com").status_code == 200
    assert client.get("/api/v1/staff/stats", base_url=ORIGIN).status_code == 200
    assert client.get("/api/v1/admin/users", base_url=ORIGIN).status_code == 403
    post(client, "/api/v1/auth/logout", json={})
    assert login(client, "admin@example.com").status_code == 200
    assert client.get("/api/v1/staff/stats", base_url=ORIGIN).status_code == 200
    assert client.get("/api/v1/admin/users", base_url=ORIGIN).status_code == 200
