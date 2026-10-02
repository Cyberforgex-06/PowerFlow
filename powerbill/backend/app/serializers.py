from __future__ import annotations

from datetime import date
from decimal import Decimal

from .models import Bill, Complaint, Meter, Payment, Tariff, User


def dec(value: Decimal | None) -> str | None:
    return format(value, "f") if value is not None else None


def sid(value) -> str | None:
    return None if value is None else str(value)


def user_json(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
    }


def tariff_json(tariff: Tariff) -> dict:
    return {
        "id": str(tariff.id),
        "name": tariff.name,
        "rate_per_kwh": dec(tariff.rate_per_kwh),
        "fixed_charge": dec(tariff.fixed_charge),
        "vat_percent": dec(tariff.vat_percent),
        "is_active": tariff.is_active,
        "created_at": tariff.created_at.isoformat(),
        # The approved schema has no updated_at column. Keep the API response stable.
        "updated_at": tariff.created_at.isoformat(),
    }


def meter_json(meter: Meter) -> dict:
    return {
        "id": str(meter.id),
        "meter_number": meter.meter_number,
        "customer_id": str(meter.customer_id),
        "tariff_id": str(meter.tariff_id),
        "opening_reading": dec(meter.opening_reading),
        "is_active": meter.is_active,
        "assigned_at": meter.installed_at.isoformat(),
    }


def effective_bill_status(bill: Bill, today: date | None = None) -> str:
    if bill.status == "paid":
        return "paid"
    today = today or date.today()
    if bill.due_date < today:
        return "overdue"
    return bill.status


def bill_json(bill: Bill, *, detail: bool = False) -> dict:
    paid_at = bill.paid_at
    body = {
        "id": str(bill.id),
        "meter_id": str(bill.meter_id),
        "customer_id": str(bill.customer_id),
        "billing_month": bill.billing_period.isoformat(),
        "units": dec(bill.units),
        "total_amount": dec(bill.total_amount),
        "status": effective_bill_status(bill),
        "due_date": bill.due_date.isoformat(),
        "created_at": bill.generated_at.isoformat(),
        "paid_at": paid_at.isoformat() if paid_at else None,
    }
    if detail:
        body.update(
            {
                "reading_id": str(bill.reading_id),
                "previous_reading": dec(bill.previous_reading),
                "current_reading": dec(bill.current_reading),
                "rate_per_kwh": dec(bill.rate_per_kwh),
                "fixed_charge": dec(bill.fixed_charge),
                "vat_percent": dec(bill.vat_percent),
                "energy_charge": dec(bill.energy_charge),
                "subtotal": dec(bill.subtotal),
                "vat_amount": dec(bill.vat_amount),
            }
        )
    return body


def payment_json(payment: Payment) -> dict:
    method = {"bank_transfer": "bank", "card": "simulated"}.get(payment.method, payment.method)
    return {
        "id": str(payment.id),
        "bill_id": str(payment.bill_id),
        "amount": dec(payment.amount),
        "method": method,
        "reference": payment.reference,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else payment.created_at.isoformat(),
    }


def complaint_json(complaint: Complaint) -> dict:
    status = {"in_review": "in_progress", "rejected": "resolved"}.get(complaint.status, complaint.status)
    return {
        "id": str(complaint.id),
        "customer_id": str(complaint.customer_id),
        "bill_id": sid(complaint.bill_id),
        "category": "billing",
        "subject": complaint.subject,
        "message": complaint.message,
        "status": status,
        "response": complaint.response,
        "responded_by": sid(complaint.resolved_by),
        "created_at": complaint.created_at.isoformat(),
        "updated_at": (complaint.resolved_at or complaint.created_at).isoformat(),
    }
