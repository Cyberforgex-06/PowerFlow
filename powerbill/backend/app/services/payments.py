from __future__ import annotations

import secrets
import string
from decimal import Decimal

from sqlalchemy import select

from ..extensions import db
from ..models import Bill, Payment, utcnow


class PaymentError(ValueError):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def _reference() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "PB-" + "".join(secrets.choice(alphabet) for _ in range(12))


def _db_method(method: str) -> str:
    mapping = {
        "simulated": "bank_transfer",
        "bank": "bank_transfer",
        "bank_transfer": "bank_transfer",
        "cash": "cash",
        "ussd": "ussd",
        "card": "card",
    }
    if method not in mapping:
        raise PaymentError("invalid_payment_method", "Unsupported payment method.")
    return mapping[method]


def record_payment(*, bill_id: int | str, recorded_by: str, method: str) -> Payment:
    try:
        parsed_bill_id = int(bill_id)
    except (TypeError, ValueError):
        raise PaymentError("bill_not_found", "Bill was not found.", 404) from None

    # PostgreSQL turns this into SELECT ... FOR UPDATE, preventing concurrent double payment.
    bill = db.session.scalar(select(Bill).where(Bill.id == parsed_bill_id).with_for_update())
    if bill is None:
        raise PaymentError("bill_not_found", "Bill was not found.", 404)
    existing = db.session.scalar(
        select(Payment.id).where(Payment.bill_id == bill.id, Payment.status == "successful")
    )
    if bill.status == "paid" or existing:
        raise PaymentError("already_paid", "This bill has already been paid.", 409)

    paid_at = utcnow()
    payment = Payment(
        bill_id=bill.id,
        recorded_by=recorded_by,
        amount=Decimal(bill.total_amount),  # server authority: never trust an amount from the browser
        method=_db_method(method),
        reference=_reference(),
        status="successful",
        paid_at=paid_at,
        created_at=paid_at,
    )
    bill.status = "paid"
    db.session.add(payment)
    db.session.commit()
    return payment
