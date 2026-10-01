from __future__ import annotations

from app.extensions import db
from app.models import AuditLog, User
from tests.conftest import ORIGIN, csrf, login, post


def test_register_valid_and_duplicate(client, app):
    token = csrf(client)
    payload = {"full_name": "Chidinma Eze", "email": "chidimma@example.com", "password": "LongEnough9A"}
    first = post(client, "/api/v1/auth/register", json=payload, token=token)
    assert first.status_code == 201
    assert first.get_json()["user"]["role"] == "customer"
    second = post(client, "/api/v1/auth/register", json=payload, token=token)
    assert second.status_code == 409


def test_weak_and_too_long_passwords_are_rejected(client):
    token = csrf(client)
    weak = post(client, "/api/v1/auth/register", json={"full_name": "A User", "email": "a@example.com", "password": "weak"}, token=token)
    assert weak.status_code == 400
    too_long = "A1a" + ("x" * 70)
    long_response = post(client, "/api/v1/auth/register", json={"full_name": "A User", "email": "b@example.com", "password": too_long}, token=token)
    assert long_response.status_code == 400
    assert "72" in long_response.get_json()["error"]["fields"]["password"]


def test_login_generic_error_unknown_vs_wrong_password(client, seeded):
    unknown = login(client, "nobody@example.com", "WrongPass123")
    wrong = login(client, "adaeze@example.com", "WrongPass123")
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.get_json()["error"] == wrong.get_json()["error"]


def test_lockout_after_five_failures(client, app, seeded):
    for _ in range(5):
        assert login(client, "adaeze@example.com", "WrongPass123").status_code == 401
    with app.app_context():
        user = db.session.get(User, seeded["customer_a"])
        assert user.failed_login_attempts >= 5
        assert user.locked_until is not None
    # Correct password still receives the same generic login error while locked.
    locked = login(client, "adaeze@example.com", "StrongPass123")
    assert locked.status_code == 401
    assert locked.get_json()["error"]["code"] == "invalid_credentials"


def test_login_creates_clean_authenticated_session_and_audit(client, app, seeded):
    response = login(client, "adaeze@example.com")
    assert response.status_code == 200
    body = response.get_json()
    assert body["csrf_token"]
    me = client.get("/api/v1/auth/me", base_url=ORIGIN)
    assert me.status_code == 200
    with app.app_context():
        assert db.session.query(AuditLog).filter_by(action="login_success").count() == 1


def test_logout_is_post_only_and_csrf_protected(client, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    assert client.get("/api/v1/auth/logout", base_url=ORIGIN).status_code == 405
    missing_csrf = client.post("/api/v1/auth/logout", headers={"Origin": ORIGIN}, base_url=ORIGIN)
    assert missing_csrf.status_code == 403


def test_ip_rate_limit_returns_429(client, app, seeded):
    app.config["LOGIN_RATE_LIMIT_PER_MINUTE"] = 2
    assert login(client, "adaeze@example.com", "WrongPass123").status_code == 401
    assert login(client, "adaeze@example.com", "WrongPass123").status_code == 401
    limited = login(client, "adaeze@example.com", "WrongPass123")
    assert limited.status_code == 429


def test_external_next_url_is_not_returned(client, seeded):
    token = csrf(client)
    response = post(client, "/api/v1/auth/login", json={"email": "adaeze@example.com", "password": "StrongPass123", "next": "https://evil.example/phish"}, token=token)
    assert response.status_code == 200
    assert response.get_json()["next"] is None


def test_login_rotates_prelogin_session_state(client, seeded):
    first_csrf = csrf(client)
    prelogin_cookie = client.get_cookie("powerbill_session")
    assert prelogin_cookie is not None
    response = post(client, "/api/v1/auth/login", json={"email":"adaeze@example.com","password":"StrongPass123"}, token=first_csrf)
    assert response.status_code == 200
    postlogin_cookie = client.get_cookie("powerbill_session")
    assert postlogin_cookie is not None
    assert postlogin_cookie.value != prelogin_cookie.value
    assert response.get_json()["csrf_token"] != first_csrf
