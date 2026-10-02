from __future__ import annotations

from decimal import Decimal

from flask import Blueprint, jsonify, request
from sqlalchemy import func, select

from ..extensions import db
from ..models import Bill, Complaint, Meter, Payment, Tariff, User, utcnow
from ..security import current_user, roles_required
from ..serializers import bill_json, complaint_json, meter_json, payment_json
from ..services.audit import audit_event
from ..services.billing import BillingError, create_opening_reading, create_reading_and_bill
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

staff_bp = Blueprint("staff", __name__)
PER_PAGE = 20
STAFF_ROLES = ("billing_officer", "admin")


@staff_bp.get("/stats")
@roles_required(*STAFF_ROLES)
def stats():
    customers = db.session.scalar(select(func.count(User.id)).where(User.role == "customer", User.is_active.is_(True))) or 0
    meters = db.session.scalar(select(func.count(Meter.id)).where(Meter.status == "active")) or 0
    unpaid = db.session.scalar(select(func.count(Bill.id)).where(Bill.status == "unpaid")) or 0
    overdue = db.session.scalar(select(func.count(Bill.id)).where(Bill.status == "overdue")) or 0
    outstanding = db.session.scalar(select(func.coalesce(func.sum(Bill.total_amount), 0)).where(Bill.status.in_(["unpaid", "overdue"]))) or 0
    collected = db.session.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "successful")
    ) or 0
    complaints = db.session.scalar(select(func.count(Complaint.id)).where(Complaint.status.in_(["open", "in_review"]))) or 0
    return jsonify(
        {
            "customers": customers,
            "meters": meters,
            "unpaid": unpaid,
            "overdue": overdue,
            "outstanding": format(Decimal(outstanding), "f"),
            "collected": format(Decimal(collected), "f"),
            "open_complaints": complaints,
        }
    )


@staff_bp.route("/meters", methods=["GET", "POST"])
@roles_required(*STAFF_ROLES)
def meters():
    if request.method == "GET":
        try:
            reject_unknown_query_args({"q", "page"})
            page = parse_page(request.args.get("page"))
        except ValueError as exc:
            return api_error("invalid_filter", str(exc), 400)
        stmt = select(Meter).order_by(Meter.installed_at.desc(), Meter.id.desc())
        q = (request.args.get("q") or "").strip()
        if q:
            pattern = f"%{escape_like(q[:80])}%"
            stmt = stmt.join(User, User.id == Meter.customer_id).where(
                (Meter.meter_number.ilike(pattern, escape="\\"))
                | (User.email.ilike(pattern, escape="\\"))
                | (User.full_name.ilike(pattern, escape="\\"))
            )
        pagination = db.paginate(stmt, page=page, per_page=PER_PAGE, error_out=False)
        return jsonify(
            {"items": [meter_json(m) for m in pagination.items], "page": page, "pages": pagination.pages, "total": pagination.total}
        )

    data = request.get_json(silent=True) or {}
    customer_id = data.get("customer_id") if isinstance(data.get("customer_id"), str) else None
    customer = db.session.get(User, customer_id) if customer_id else None
    try:
        tariff_id = parse_db_id(data.get("tariff_id"), field="Tariff ID")
    except ValueError:
        tariff_id = None
    tariff = db.session.get(Tariff, tariff_id) if tariff_id else None
    if customer is None or customer.role != "customer" or not customer.is_active:
        return api_error("validation_error", "Select an active customer.", 400, {"customer_id": "Invalid customer."})
    if tariff is None or not tariff.is_active:
        return api_error("validation_error", "Select an active tariff.", 400, {"tariff_id": "Invalid tariff."})
    try:
        meter_number = clean_text(data.get("meter_number"), max_length=48)
        opening = decimal_value(data.get("opening_reading"), name="Opening reading", maximum=Decimal("999999999999"))
    except ValueError as exc:
        return api_error("validation_error", str(exc), 400)
    if db.session.scalar(select(Meter.id).where(Meter.meter_number == meter_number)):
        return api_error("conflict", "That meter number is already assigned.", 409)
    address = (customer.customer_profile.address if customer.customer_profile else None) or "Not provided"
    meter = Meter(
        meter_number=meter_number,
        customer_id=customer.id,
        tariff_id=tariff.id,
        address=address,
        status="active",
    )
    db.session.add(meter)
    db.session.flush()
    create_opening_reading(meter=meter, submitted_by=current_user().id, opening=opening)
    db.session.commit()
    audit_event(
        "meter_assigned",
        actor_id=current_user().id,
        target_type="meter",
        target_id=meter.id,
        details={"customer_id": customer.id, "opening_reading": format(opening, "f")},
    )
    return jsonify({"meter": meter_json(meter)}), 201


@staff_bp.post("/readings")
@roles_required(*STAFF_ROLES)
def reading():
    data = request.get_json(silent=True) or {}
    try:
        meter_id = parse_db_id(data.get("meter_id"), field="Meter ID")
    except ValueError:
        return api_error("not_found", "Meter was not found.", 404)
    meter = db.session.get(Meter, meter_id)
    if meter is None:
        return api_error("not_found", "Meter was not found.", 404)
    try:
        value = decimal_value(data.get("reading"), name="Reading", maximum=Decimal("999999999999"))
        bill = create_reading_and_bill(meter=meter, submitted_by=current_user().id, current=value, source="staff")
    except (ValueError, BillingError) as exc:
        if isinstance(exc, BillingError):
            return api_error(exc.code, exc.message, exc.status)
        return api_error("validation_error", str(exc), 400)
    audit_event("reading_entered", actor_id=current_user().id, target_type="meter", target_id=meter.id, details={"bill_id": bill.id})
    return jsonify({"bill": bill_json(bill, detail=True)}), 201


@staff_bp.get("/bills")
@roles_required(*STAFF_ROLES)
def bills():
    try:
        reject_unknown_query_args({"q", "status", "month", "page"})
        page = parse_page(request.args.get("page"))
        month = parse_month(request.args.get("month"))
    except ValueError as exc:
        return api_error("invalid_filter", str(exc), 400)
    status = request.args.get("status")
    if status and status not in {"paid", "unpaid", "overdue"}:
        return api_error("invalid_filter", "Unsupported bill status.", 400)
    stmt = select(Bill)
    if status:
        stmt = stmt.where(Bill.status == status)
    if month:
        stmt = stmt.where(Bill.billing_period == month)
    q = (request.args.get("q") or "").strip()
    if q:
        pattern = f"%{escape_like(q[:80])}%"
        stmt = stmt.join(Meter, Meter.id == Bill.meter_id).join(User, User.id == Meter.customer_id).where(
            (Meter.meter_number.ilike(pattern, escape="\\"))
            | (User.email.ilike(pattern, escape="\\"))
            | (User.full_name.ilike(pattern, escape="\\"))
        )
    stmt = stmt.order_by(Bill.generated_at.desc())
    pagination = db.paginate(stmt, page=page, per_page=PER_PAGE, error_out=False)
    return jsonify(
        {"items": [bill_json(b) for b in pagination.items], "page": page, "pages": pagination.pages, "total": pagination.total}
    )


@staff_bp.get("/bills/<bill_id>")
@roles_required(*STAFF_ROLES)
def bill_detail(bill_id: str):
    try:
        parsed = parse_db_id(bill_id, field="Bill ID")
    except ValueError:
        return api_error("not_found", "Bill was not found.", 404)
    bill = db.session.get(Bill, parsed)
    if bill is None:
        return api_error("not_found", "Bill was not found.", 404)
    return jsonify({"bill": bill_json(bill, detail=True)})


@staff_bp.post("/bills/<bill_id>/pay")
@roles_required(*STAFF_ROLES)
def pay_bill(bill_id: str):
    data = request.get_json(silent=True) or {}
    method = data.get("method", "cash")
    try:
        payment = record_payment(bill_id=bill_id, recorded_by=current_user().id, method=method)
    except PaymentError as exc:
        return api_error(exc.code, exc.message, exc.status)
    audit_event(
        "payment_recorded",
        actor_id=current_user().id,
        target_type="bill",
        target_id=bill_id,
        details={"reference": payment.reference, "method": method},
    )
    return jsonify({"payment": payment_json(payment), "bill": bill_json(db.session.get(Bill, payment.bill_id), detail=True)})


@staff_bp.get("/complaints")
@roles_required(*STAFF_ROLES)
def complaints():
    try:
        reject_unknown_query_args({"status", "page"})
        page = parse_page(request.args.get("page"))
    except ValueError as exc:
        return api_error("invalid_filter", str(exc), 400)
    status = request.args.get("status")
    if status and status not in {"open", "in_progress", "resolved"}:
        return api_error("invalid_filter", "Unsupported complaint status.", 400)
    db_status = {"in_progress": "in_review"}.get(status, status)
    stmt = select(Complaint)
    if db_status:
        stmt = stmt.where(Complaint.status == db_status)
    stmt = stmt.order_by(Complaint.created_at.desc())
    pagination = db.paginate(stmt, page=page, per_page=PER_PAGE, error_out=False)
    return jsonify(
        {"items": [complaint_json(c) for c in pagination.items], "page": page, "pages": pagination.pages, "total": pagination.total}
    )


@staff_bp.patch("/complaints/<complaint_id>")
@roles_required(*STAFF_ROLES)
def respond_complaint(complaint_id: str):
    try:
        parsed = parse_db_id(complaint_id, field="Complaint ID")
    except ValueError:
        return api_error("not_found", "Complaint was not found.", 404)
    complaint = db.session.get(Complaint, parsed)
    if complaint is None:
        return api_error("not_found", "Complaint was not found.", 404)
    data = request.get_json(silent=True) or {}
    status = data.get("status", {"in_review": "in_progress"}.get(complaint.status, complaint.status))
    if status not in {"open", "in_progress", "resolved"}:
        return api_error("validation_error", "Unsupported complaint status.", 400)
    try:
        response = clean_multiline(data.get("response"), max_length=4000)
    except ValueError as exc:
        return api_error("validation_error", str(exc), 400, {"response": str(exc)})
    complaint.status = {"in_progress": "in_review"}.get(status, status)
    complaint.response = response
    if complaint.status == "resolved":
        complaint.resolved_by = current_user().id
        complaint.resolved_at = utcnow()
    db.session.commit()
    audit_event(
        "complaint_responded",
        actor_id=current_user().id,
        target_type="complaint",
        target_id=complaint.id,
        details={"status": status},
    )
    return jsonify({"complaint": complaint_json(complaint)})
