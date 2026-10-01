from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from app.extensions import db
from app.models import Bill, MeterReading


def test_mark_overdue_cli(app, seeded):
    with app.app_context():
        reading = MeterReading(
            meter_id=seeded["meter_a"],
            submitted_by=seeded["customer_a"],
            billing_period=date.today().replace(day=1),
            reading_kwh=Decimal("6700"),
        )
        db.session.add(reading)
        db.session.flush()
        bill = Bill(
            meter_id=seeded["meter_a"],
            reading_id=reading.id,
            billing_period=reading.billing_period,
            previous_reading=Decimal("6658"),
            current_reading=Decimal("6700"),
            units_consumed=Decimal("42"),
            rate_per_kwh=Decimal("83.14"),
            fixed_charge=Decimal("1250"),
            vat_percent=Decimal("7.5"),
            energy_charge=Decimal("3491.88"),
            vat_amount=Decimal("355.64"),
            total_amount=Decimal("5097.52"),
            status="unpaid",
            due_date=date.today() - timedelta(days=1),
        )
        db.session.add(bill)
        db.session.commit()
        bill_id = bill.id
    runner = app.test_cli_runner()
    result = runner.invoke(args=["mark-overdue"])
    assert result.exit_code == 0
    with app.app_context():
        assert db.session.get(Bill, bill_id).status == "overdue"
