from __future__ import annotations

from decimal import Decimal

from app.extensions import db
from app.models import Bill, Payment, Tariff
from app.services.billing import BillingError, calculate_bill
from tests.conftest import login, post


def test_bill_math_and_rounding():
    result = calculate_bill(
        Decimal("6658.000"),
        Decimal("6842.000"),
        Decimal("83.1400"),
        Decimal("1250.00"),
        Decimal("7.5"),
    )
    assert result.units == Decimal("184.000")
    assert result.energy_charge == Decimal("15297.76")
    assert result.subtotal == Decimal("16547.76")
    assert result.vat_amount == Decimal("1241.08")
    assert result.total == Decimal("17788.84")


def test_lower_and_huge_consumption_are_rejected():
    try:
        calculate_bill(Decimal("100"), Decimal("99"), Decimal("1"), Decimal("0"), Decimal("7.5"))
        raise AssertionError("Expected BillingError")
    except BillingError as exc:
        assert exc.code == "reading_too_low"
    try:
        calculate_bill(Decimal("0"), Decimal("50000.001"), Decimal("1"), Decimal("0"), Decimal("7.5"))
        raise AssertionError("Expected BillingError")
    except BillingError as exc:
        assert exc.code == "manual_verification_required"


def test_numeric_nan_infinity_negative_rejected(client, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    for bad in ["NaN", "Infinity", "-1", "1e9999"]:
        response = post(client, "/api/v1/me/readings", json={"meter_id": seeded["meter_a"], "reading": bad})
        assert response.status_code == 400


def test_reading_generates_bill_and_duplicate_is_blocked(client, app, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    first = post(client, "/api/v1/me/readings", json={"meter_id": seeded["meter_a"], "reading": "6842.000"})
    assert first.status_code == 201
    assert Decimal(first.get_json()["bill"]["total_amount"]) == Decimal("17788.84")
    second = post(client, "/api/v1/me/readings", json={"meter_id": seeded["meter_a"], "reading": "6900"})
    assert second.status_code == 409


def test_bill_keeps_tariff_snapshot(client, app, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    response = post(client, "/api/v1/me/readings", json={"meter_id": seeded["meter_a"], "reading": "6842"})
    bill_id = response.get_json()["bill"]["id"]
    with app.app_context():
        tariff = db.session.get(Tariff, seeded["tariff_id"])
        tariff.rate_per_kwh = Decimal("999.0000")
        db.session.commit()
        bill = db.session.get(Bill, bill_id)
        assert bill.rate_per_kwh == Decimal("83.1400")
        assert bill.total_amount == Decimal("17788.84")


def test_payment_amount_comes_from_bill_and_double_payment_blocked(client, app, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    bill = post(client, "/api/v1/me/readings", json={"meter_id": seeded["meter_a"], "reading": "6842"}).get_json()["bill"]
    paid = post(client, f"/api/v1/me/bills/{bill['id']}/pay", json={"method": "simulated", "amount": "0.01"})
    assert paid.status_code == 200
    assert paid.get_json()["payment"]["amount"] == bill["total_amount"]
    second = post(client, f"/api/v1/me/bills/{bill['id']}/pay", json={"method": "simulated"})
    assert second.status_code == 409
    with app.app_context():
        assert db.session.query(Payment).filter_by(bill_id=bill["id"]).count() == 1


def test_production_customer_cannot_simulate_payment(client, app, seeded):
    assert login(client, "adaeze@example.com").status_code == 200
    bill = post(client, "/api/v1/me/readings", json={"meter_id": seeded["meter_a"], "reading": "6842"}).get_json()["bill"]
    app.config["ENV_NAME"] = "production"
    response = post(client, f"/api/v1/me/bills/{bill['id']}/pay", json={"method": "simulated"})
    assert response.status_code == 503
    with app.app_context():
        assert db.session.get(Bill, bill["id"]).status == "unpaid"
        assert db.session.query(Payment).filter_by(bill_id=bill["id"]).count() == 0
