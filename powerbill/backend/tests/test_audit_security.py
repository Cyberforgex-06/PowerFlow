from __future__ import annotations

from app.extensions import db
from app.models import AuditLog
from tests.conftest import ORIGIN, csrf, login, post

def test_failed_login_and_access_denied_are_audited(client, app, seeded):
    login(client, "adaeze@example.com", "WrongPass123")
    assert login(client, "adaeze@example.com").status_code == 200
    assert client.get("/api/v1/admin/users", base_url=ORIGIN).status_code == 403
    with app.app_context():
        assert db.session.query(AuditLog).filter_by(action="login_failed").count() >= 1
        assert db.session.query(AuditLog).filter_by(action="access_denied").count() >= 1

def test_csrf_failures_are_audited(client, app, seeded):
    token = csrf(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email":"adaeze@example.com","password":"StrongPass123"},
        headers={"Origin":"https://evil.example", "X-CSRF-Token":token},
        base_url=ORIGIN,
    )
    assert response.status_code == 403
    with app.app_context():
        assert db.session.query(AuditLog).filter_by(action="csrf_origin_rejected").count() >= 1

def test_payment_event_is_audited(client, app, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    bill = post(client, "/api/v1/me/readings", json={"meter_id": seeded["meter_a"], "reading":"6842"}).get_json()["bill"]
    assert post(client, f"/api/v1/me/bills/{bill['id']}/pay", json={"method":"simulated"}).status_code == 200
    with app.app_context():
        assert db.session.query(AuditLog).filter_by(action="payment_recorded").count() >= 1
