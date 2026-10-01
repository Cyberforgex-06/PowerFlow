from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from sqlalchemy import select

from ..extensions import db
from ..models import Bill, Meter, MeterReading, Tariff, utcnow

KOBO = Decimal("0.01")
THREE_DP = Decimal("0.001")
MAX_MANUAL_CONSUMPTION = Decimal("50000")
LAGOS = ZoneInfo("Africa/Lagos")


class BillingError(ValueError):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


@dataclass(frozen=True)
class BillMath:
    units: Decimal
    rate: Decimal
    fixed_charge: Decimal
    vat_percent: Decimal
    energy_charge: Decimal
    subtotal: Decimal
    vat_amount: Decimal
    total: Decimal


def money(value: Decimal) -> Decimal:
    return value.quantize(KOBO, rounding=ROUND_HALF_UP)


def calculate_bill(
    previous: Decimal,
    current: Decimal,
    rate: Decimal,
    fixed_charge: Decimal,
    vat_percent: Decimal,
) -> BillMath:
    if current < previous:
        raise BillingError("reading_too_low", "Current reading cannot be lower than the previous reading.")
    units = (current - previous).quantize(THREE_DP, rounding=ROUND_HALF_UP)
    if units > MAX_MANUAL_CONSUMPTION:
        raise BillingError(
            "manual_verification_required",
            "Consumption above 50,000 kWh requires manual verification.",
            422,
        )
    energy = money(units * rate)
    subtotal = money(energy + fixed_charge)
    vat = money(subtotal * vat_percent / Decimal("100"))
    total = money(subtotal + vat)
    return BillMath(units, rate, fixed_charge, vat_percent, energy, subtotal, vat, total)


def server_billing_month() -> date:
    today = utcnow().astimezone(LAGOS).date()
    return today.replace(day=1)


def previous_billing_month(month: date | None = None) -> date:
    month = month or server_billing_month()
    previous_day = month - timedelta(days=1)
    return previous_day.replace(day=1)


def create_opening_reading(*, meter: Meter, submitted_by: str, opening: Decimal) -> MeterReading:
    """Persist the assignment baseline in the previous billing period.

    The approved schema has no opening_reading column on meters. A prior-period
    baseline preserves the business rule without changing schema.sql and still
    allows the first real reading in the current month to generate a bill.
    """
    baseline = MeterReading(
        meter_id=meter.id,
        reading_kwh=opening,
        billing_period=previous_billing_month(),
        submitted_by=submitted_by,
    )
    db.session.add(baseline)
    return baseline


def create_reading_and_bill(*, meter: Meter, submitted_by: str, current: Decimal, source: str) -> Bill:
    if meter.status != "active":
        raise BillingError("meter_inactive", "This meter is inactive.", 409)

    billing_month = server_billing_month()
    duplicate = db.session.scalar(
        select(MeterReading.id).where(
            MeterReading.meter_id == meter.id,
            MeterReading.billing_period == billing_month,
        )
    )
    if duplicate:
        raise BillingError("duplicate_month_reading", "A reading already exists for this meter this month.", 409)

    previous_row = db.session.scalars(
        select(MeterReading)
        .where(MeterReading.meter_id == meter.id)
        .order_by(MeterReading.billing_period.desc(), MeterReading.created_at.desc())
        .limit(1)
    ).first()
    previous = Decimal(previous_row.reading_kwh if previous_row else 0)

    tariff = db.session.get(Tariff, meter.tariff_id)
    if tariff is None or not tariff.is_active:
        raise BillingError("tariff_unavailable", "The meter does not have an active tariff.", 409)

    math = calculate_bill(
        previous,
        current,
        Decimal(tariff.rate_per_kwh),
        Decimal(tariff.fixed_charge),
        Decimal(tariff.vat_percent),
    )

    reading = MeterReading(
        meter_id=meter.id,
        submitted_by=submitted_by,
        billing_period=billing_month,
        reading_kwh=current,
    )
    db.session.add(reading)
    db.session.flush()

    created = utcnow()
    bill = Bill(
        meter_id=meter.id,
        reading_id=reading.id,
        billing_period=billing_month,
        previous_reading=previous,
        current_reading=current,
        units_consumed=math.units,
        rate_per_kwh=math.rate,
        fixed_charge=math.fixed_charge,
        vat_percent=math.vat_percent,
        energy_charge=math.energy_charge,
        vat_amount=math.vat_amount,
        total_amount=math.total,
        status="unpaid",
        due_date=(created.astimezone(LAGOS).date() + timedelta(days=14)),
        generated_by=submitted_by,
        generated_at=created,
    )
    db.session.add(bill)
    db.session.commit()
    return bill
