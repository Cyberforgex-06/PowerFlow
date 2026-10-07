from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Complaint, User
from tests.conftest import ORIGIN, csrf, login, post


def test_csrf_and_origin_required(client, seeded):
    token = csrf(client)
    no_token = client.post("/api/v1/auth/login", json={"email": "adaeze@example.com", "password": "StrongPass123"}, headers={"Origin": ORIGIN}, base_url=ORIGIN)
    assert no_token.status_code == 403
    bad_origin = client.post("/api/v1/auth/login", json={"email": "adaeze@example.com", "password": "StrongPass123"}, headers={"Origin": "https://evil.example", "X-CSRF-Token": token}, base_url=ORIGIN)
    assert bad_origin.status_code == 403


def test_security_headers_and_no_store(client):
    response = client.get("/api/v1/auth/csrf", base_url=ORIGIN)
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["Cache-Control"] == "no-store"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]


def test_secure_cookie_flag_can_be_enforced(client, app, seeded):
    app.config["SESSION_COOKIE_SECURE"] = True
    response = client.get("/api/v1/auth/csrf", base_url=ORIGIN)
    cookies = response.headers.getlist("Set-Cookie")
    assert any("HttpOnly" in c and "Secure" in c and "SameSite=Lax" in c for c in cookies)


def test_sql_injection_search_is_data_not_sql(client, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    response = client.get("/api/v1/me/bills?q=%25%27%20OR%201%3D1--", base_url=ORIGIN)
    assert response.status_code == 200
    assert response.is_json


def test_xss_payload_is_returned_only_as_json_text(client, app, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    payload = "<script>alert('x')</script> billing question"
    response = post(client, "/api/v1/me/complaints", json={"category": "billing", "subject": "Question", "message": payload})
    assert response.status_code == 201
    assert response.content_type.startswith("application/json")
    assert response.get_json()["complaint"]["message"] == payload


def test_database_role_constraint(app):
    with app.app_context():
        bad = User(email="bad@example.com", full_name="Bad Role", password_hash="x", role="root")
        db.session.add(bad)
        try:
            db.session.commit()
            raise AssertionError("Expected database constraint failure")
        except IntegrityError:
            db.session.rollback()


def test_hsts_header_in_production_mode(client, app):
    app.config["ENV_NAME"] = "production"
    response = client.get("/api/v1/auth/csrf", base_url=ORIGIN)
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"
