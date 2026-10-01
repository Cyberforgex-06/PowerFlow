from __future__ import annotations

from decimal import Decimal

from flask import Blueprint, jsonify, request
from sqlalchemy import func, select

from ..extensions import db
from ..models import Bill, Complaint, Meter, Payment
from ..security import current_user, login_required
from ..serializers import bill_json, complaint_json, meter_json, payment_json
from ..services.audit import audit_event
from ..services.billing import BillingError, create_reading_and_bill
from ..services.payments import PaymentError, record_payment
from ..utils import (
    api_error,
    clean_multiline,
    clean_text,
    decimal_value,
    escape_like,
    parse_db_id,
    parse_month,
    parse_page,
    reject_unknown_query_args,
)

me_bp = Blueprint("me", __name__)
PER_PAGE = 20


def _own_bill_or_404(bill_id: str) -> Bill | None:
    user = current_user()
    try:
        parsed = parse_db_id(bill_id, field="Bill ID")
    except ValueError:
        return None
    bill = db.session.scalar(
        select(Bill).join(Meter, Meter.id == Bill.meter_id).where(Bill.id == parsed, Meter.customer_id == user.id)
    )
    if bill is None:
        # Do not reveal whether the bill exists for another customer.
        possible = db.session.get(Bill, parsed)
        if possible is not None:
            audit_event("idor_bill_denied", actor_id=user.id, target_type="bill", target_id=bill_id)
        return None
    return bill


@me_bp.get("/dashboard")
@login_required
def dashboard():
    user = current_user()
    own_bills = select(Bill).join(Meter, Meter.id == Bill.meter_id).where(Meter.customer_id == user.id)
    outstanding = db.session.scalar(
        select(func.coalesce(func.sum(Bill.total_amount), 0))
        .join(Meter, Meter.id == Bill.meter_id)
        .where(Meter.customer_id == user.id, Bill.status.in_(["unpaid", "overdue"]))
    ) or Decimal("0")
    unpaid = db.session.scalar(
        select(func.count(Bill.id))
        .join(Meter, Meter.id == Bill.meter_id)
        .where(Meter.customer_id == user.id, Bill.status.in_(["unpaid", "overdue"]))
    ) or 0
    recent = db.session.scalars(own_bills.order_by(Bill.billing_period.desc()).limit(6)).all()
    usage = [{"month": b.billing_period.isoformat(), "units": format(b.units, "f")} for b in reversed(recent)]
    return jsonify(
        {
            "outstanding_balance": format(Decimal(outstanding), "f"),
            "unpaid_count": int(unpaid),
            "usage_6_months": usage,
            "recent_bills": [bill_json(b) for b in recent[:5]],
        }
    )


@me_bp.get("/meters")
@login_required
def meters():
    user = current_user()
    items = db.session.scalars(select(Meter).where(Meter.customer_id == user.id).order_by(Meter.meter_number)).all()
    return jsonify({"items": [meter_json(m) for m in items]})


@me_bp.get("/bills")
@login_required
def bills():
    try:
        reject_unknown_query_args({"status", "month", "page", "q"})
        page = parse_page(request.args.get("page"))
        month = parse_month(request.args.get("month"))
    except ValueError as exc:
        return api_error("invalid_filter", str(exc), 400)

    status = request.args.get("status")
    if status and status not in {"paid", "unpaid", "overdue"}:
        return api_error("invalid_filter", "Unsupported bill status.", 400)

    user = current_user()
    stmt = select(Bill).join(Meter, Meter.id == Bill.meter_id).where(Meter.customer_id == user.id)
    if status:
        stmt = stmt.where(Bill.status == status)
    if month:
        stmt = stmt.where(Bill.billing_period == month)
    q = (request.args.get("q") or "").strip()
    if q:
        pattern = f"%{escape_like(q[:64])}%"
        stmt = stmt.where(Meter.meter_number.ilike(pattern, escape="\\"))
    stmt = stmt.order_by(Bill.billing_period.desc(), Bill.generated_at.desc())
    pagination = db.paginate(stmt, page=page, per_page=PER_PAGE, error_out=False)
    return jsonify(
        {"items": [bill_json(b) for b in pagination.items], "page": page, "pages": pagination.pages, "total": pagination.total}
    )


@me_bp.get("/bills/<bill_id>")
@login_required
def bill_detail(bill_id: str):
    bill = _own_bill_or_404(bill_id)
    if bill is None:
        return api_error("not_found", "Bill was not found.", 404)
    return jsonify({"bill": bill_json(bill, detail=True)})


@me_bp.post("/bills/<bill_id>/pay")
@login_required
def pay_bill(bill_id: str):
    bill = _own_bill_or_404(bill_id)
    if bill is None:
        return api_error("not_found", "Bill was not found.", 404)
    data = request.get_json(silent=True) or {}
    method = data.get("method", "simulated")
    if method != "simulated":
        return api_error("invalid_payment_method", "Customer checkout is simulated in this project.", 400)
    try:
        payment = record_payment(bill_id=bill.id, recorded_by=current_user().id, method="simulated")
    except PaymentError as exc:
        return api_error(exc.code, exc.message, exc.status)
    audit_event(
        "payment_recorded",
        actor_id=current_user().id,
        target_type="bill",
        target_id=bill.id,
        details={"reference": payment.reference, "method": "simulated"},
    )
    refreshed = db.session.get(Bill, bill.id)
    return jsonify({"payment": payment_json(payment), "bill": bill_json(refreshed, detail=True)})


@me_bp.get("/bills/<bill_id>/receipt")
@login_required
def receipt(bill_id: str):
    bill = _own_bill_or_404(bill_id)
    if bill is None:
        return api_error("not_found", "Bill was not found.", 404)
    payment = db.session.scalar(
        select(Payment)
        .where(Payment.bill_id == bill.id, Payment.status == "successful")
        .order_by(Payment.created_at.desc())
        .limit(1)
    )
    if payment is None:
        return api_error("receipt_unavailable", "A receipt is available only after payment.", 409)
    return jsonify({"bill": bill_json(bill, detail=True), "payment": payment_json(payment)})


@me_bp.post("/readings")
@login_required
def submit_reading():
    data = request.get_json(silent=True) or {}
    try:
        meter_id = parse_db_id(data.get("meter_id"), field="Meter ID")
    except ValueError:
        return api_error("not_found", "Meter was not found.", 404)
    meter = db.session.get(Meter, meter_id)
    if meter is None or meter.customer_id != current_user().id:
        if meter is not None:
            audit_event("idor_meter_denied", actor_id=current_user().id, target_type="meter", target_id=meter.id)
        return api_error("not_found", "Meter was not found.", 404)
    try:
        reading = decimal_value(data.get("reading"), name="Reading", maximum=Decimal("999999999999"))
        bill = create_reading_and_bill(meter=meter, submitted_by=current_user().id, current=reading, source="customer")
    except (ValueError, BillingError) as exc:
        if isinstance(exc, BillingError):
            return api_error(exc.code, exc.message, exc.status)
        return api_error("validation_error", str(exc), 400)
    audit_event(
        "reading_submitted",
        actor_id=current_user().id,
        target_type="meter",
        target_id=meter.id,
        details={"bill_id": bill.id, "source": "customer"},
    )
    return jsonify({"bill": bill_json(bill, detail=True)}), 201


@me_bp.route("/complaints", methods=["GET", "POST"])
@login_required
def complaints():
    user = current_user()
    if request.method == "GET":
        try:
            reject_unknown_query_args({"status", "page"})
            page = parse_page(request.args.get("page"))
        except ValueError as exc:
            return api_error("invalid_filter", str(exc), 400)
        status = request.args.get("status")
        if status and status not in {"open", "in_progress", "resolved"}:
            return api_error("invalid_filter", "Unsupported complaint status.", 400)
        db_status = {"in_progress": "in_review"}.get(status, status)
        stmt = select(Complaint).where(Complaint.customer_id == user.id)
        if db_status:
            stmt = stmt.where(Complaint.status == db_status)
        stmt = stmt.order_by(Complaint.created_at.desc())
        pagination = db.paginate(stmt, page=page, per_page=PER_PAGE, error_out=False)
        return jsonify(
            {"items": [complaint_json(c) for c in pagination.items], "page": page, "pages": pagination.pages, "total": pagination.total}
        )

    data = request.get_json(silent=True) or {}
    fields = {}
    try:
        # Kept in the API for UI/report compatibility; schema.sql does not persist a category column.
        clean_text(data.get("category"), max_length=40)
    except ValueError as exc:
        fields["category"] = str(exc)
    try:
        subject = clean_text(data.get("subject"), max_length=160)
    except ValueError as exc:
        fields["subject"] = str(exc)
        subject = ""
    try:
        message = clean_multiline(data.get("message"), max_length=4000)
    except ValueError as exc:
        fields["message"] = str(exc)
        message = ""
    bill_id_raw = data.get("bill_id") or None
    bill_id = None
    if bill_id_raw:
        bill = _own_bill_or_404(str(bill_id_raw))
        if bill is None:
            fields["bill_id"] = "Bill was not found."
        else:
            bill_id = bill.id
    if fields:
        return api_error("validation_error", "Please correct the highlighted fields.", 400, fields)
    complaint = Complaint(customer_id=user.id, bill_id=bill_id, subject=subject, message=message, status="open")
    db.session.add(complaint)
    db.session.commit()
    audit_event("complaint_created", actor_id=user.id, target_type="complaint", target_id=complaint.id)
    return jsonify({"complaint": complaint_json(complaint)}), 201
