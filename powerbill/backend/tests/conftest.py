from __future__ import annotations

from decimal import Decimal

import pytest

from app import create_app
from app.extensions import db
from app.models import Meter, Tariff, User
from app.security import hash_password

ORIGIN = "http://localhost"


@pytest.fixture()
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def csrf(client) -> str:
    response = client.get("/api/v1/auth/csrf", base_url=ORIGIN)
    assert response.status_code == 200
    return response.get_json()["csrf_token"]


def post(client, path: str, *, json=None, token: str | None = None, origin: str = ORIGIN):
    token = token or csrf(client)
    return client.post(path, json=json, headers={"Origin": origin, "X-CSRF-Token": token}, base_url=ORIGIN)


def patch(client, path: str, *, json=None, token: str | None = None, origin: str = ORIGIN):
    token = token or csrf(client)
    return client.patch(path, json=json, headers={"Origin": origin, "X-CSRF-Token": token}, base_url=ORIGIN)


def login(client, email: str, password: str = "StrongPass123"):
    return post(client, "/api/v1/auth/login", json={"email": email, "password": password})


@pytest.fixture()
def seeded(app):
    with app.app_context():
        tariff = Tariff(
            name="Residential R2",
            rate_per_kwh=Decimal("83.1400"),
            fixed_charge=Decimal("1250.00"),
            vat_percent=Decimal("7.500"),
            is_active=True,
        )
        customer_a = User(
            email="adaeze@example.com",
            full_name="Adaeze Okafor",
            password_hash=hash_password("StrongPass123"),
            role="customer",
        )
        customer_b = User(
            email="musa@example.com",
            full_name="Musa Ibrahim",
            password_hash=hash_password("StrongPass123"),
            role="customer",
        )
        staff = User(
            email="officer@example.com",
            full_name="Billing Officer",
            password_hash=hash_password("StrongPass123"),
            role="billing_officer",
        )
        admin = User(
            email="admin@example.com",
            full_name="PowerBill Admin",
            password_hash=hash_password("StrongPass123"),
            role="admin",
        )
        db.session.add_all([tariff, customer_a, customer_b, staff, admin])
        db.session.flush()
        meter_a = Meter(
            meter_number="45-7821-9032",
            customer_id=customer_a.id,
            tariff_id=tariff.id,
            opening_reading=Decimal("6658.000"),
        )
        meter_b = Meter(
            meter_number="19-2033-8871",
            customer_id=customer_b.id,
            tariff_id=tariff.id,
            opening_reading=Decimal("1000.000"),
        )
        db.session.add_all([meter_a, meter_b])
        db.session.commit()
        return {
            "tariff_id": tariff.id,
            "customer_a": customer_a.id,
            "customer_b": customer_b.id,
            "staff": staff.id,
            "admin": admin.id,
            "meter_a": meter_a.id,
            "meter_b": meter_b.id,
        }
