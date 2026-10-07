from __future__ import annotations

from flask import Blueprint, jsonify
from sqlalchemy import func, select

from ..extensions import db
from ..models import Bill, Payment, Tariff, User
from ..serializers import tariff_json

public_bp = Blueprint("public", __name__)


@public_bp.get("/tariffs")
def tariffs():
    items = db.session.scalars(select(Tariff).where(Tariff.is_active.is_(True)).order_by(Tariff.name)).all()
    return jsonify({"items": [tariff_json(item) for item in items]})


@public_bp.get("/stats")
def stats():
    customers = db.session.scalar(select(func.count(User.id)).where(User.role == "customer", User.is_active.is_(True))) or 0
    bills = db.session.scalar(select(func.count(Bill.id))) or 0
    payments = db.session.scalar(select(func.count(Payment.id)).where(Payment.status == "successful")) or 0
    paid_on_time = db.session.scalar(
        select(func.count(func.distinct(Bill.id)))
        .join(Payment, Payment.bill_id == Bill.id)
        .where(
            Bill.status == "paid",
            Payment.status == "successful",
            Payment.paid_at.is_not(None),
            func.date(Payment.paid_at) <= Bill.due_date,
        )
    ) or 0
    on_time_rate = round((paid_on_time / bills * 100), 1) if bills else 0.0
    return jsonify(
        {
            "active_customers": customers,
            "bills_generated": bills,
            "payments_processed": payments,
            "on_time_payment_rate": on_time_rate,
        }
    )
