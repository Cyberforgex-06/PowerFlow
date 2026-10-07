from __future__ import annotations

from decimal import Decimal

from flask import Blueprint, jsonify, request
from sqlalchemy import select

from ..extensions import db
from ..models import AuditLog, Tariff, User
from ..security import current_user, roles_required
from ..serializers import tariff_json, user_json
from ..services.audit import audit_event
from ..utils import api_error, clean_text, decimal_value, escape_like, parse_db_id, parse_page, reject_unknown_query_args

admin_bp = Blueprint("admin", __name__)
PER_PAGE = 20


@admin_bp.get("/users")
@roles_required("admin")
def users():
    try:
        reject_unknown_query_args({"q", "role", "active", "page"})
        page = parse_page(request.args.get("page"))
    except ValueError as exc:
        return api_error("invalid_filter", str(exc), 400)
    role = request.args.get("role")
    if role and role not in {"customer", "billing_officer", "admin"}:
        return api_error("invalid_filter", "Unsupported role.", 400)
    active = request.args.get("active")
    if active not in {None, "true", "false"}:
        return api_error("invalid_filter", "active must be true or false.", 400)
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if active is not None:
        stmt = stmt.where(User.is_active.is_(active == "true"))
    q = (request.args.get("q") or "").strip()
    if q:
        pattern = f"%{escape_like(q[:80])}%"
        stmt = stmt.where((User.email.ilike(pattern, escape="\\")) | (User.full_name.ilike(pattern, escape="\\")))
    stmt = stmt.order_by(User.created_at.desc())
    pagination = db.paginate(stmt, page=page, per_page=PER_PAGE, error_out=False)
    return jsonify({"items": [user_json(u) for u in pagination.items], "page": page, "pages": pagination.pages, "total": pagination.total})


@admin_bp.patch("/users/<user_id>")
@roles_required("admin")
def update_user(user_id: str):
    target = db.session.get(User, user_id)
    if target is None:
        return api_error("not_found", "User was not found.", 404)
    data = request.get_json(silent=True) or {}
    unknown = set(data) - {"role", "is_active"}
    if unknown:
        return api_error("validation_error", f"Unsupported field: {sorted(unknown)[0]}", 400)
    before = {"role": target.role, "is_active": target.is_active}
    if "role" in data:
        role = data["role"]
        if role not in {"customer", "billing_officer", "admin"}:
            return api_error("validation_error", "Unsupported role.", 400)
        if target.id == current_user().id and role != target.role:
            return api_error("self_role_change_forbidden", "You cannot change your own role.", 400)
        target.role = role
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            return api_error("validation_error", "is_active must be boolean.", 400)
        target.is_active = data["is_active"]
    db.session.commit()
    after = {"role": target.role, "is_active": target.is_active}
    audit_event("user_role_status_changed", actor_id=current_user().id, target_type="user", target_id=target.id, details={"before": before, "after": after})
    return jsonify({"user": user_json(target)})


@admin_bp.route("/tariffs", methods=["GET", "POST", "PATCH"])
@roles_required("admin")
def tariffs():
    if request.method == "GET":
        items = db.session.scalars(select(Tariff).order_by(Tariff.created_at.desc())).all()
        return jsonify({"items": [tariff_json(t) for t in items]})

    data = request.get_json(silent=True) or {}
    if request.method == "POST":
        fields = {}
        try:
            name = clean_text(data.get("name"), max_length=100)
        except ValueError as exc:
            fields["name"] = str(exc)
            name = ""
        try:
            rate = decimal_value(data.get("rate_per_kwh"), name="Rate", maximum=Decimal("1000000"))
        except ValueError as exc:
            fields["rate_per_kwh"] = str(exc)
            rate = Decimal("0")
        try:
            fixed = decimal_value(data.get("fixed_charge", "0"), name="Fixed charge", maximum=Decimal("100000000"))
        except ValueError as exc:
            fields["fixed_charge"] = str(exc)
            fixed = Decimal("0")
        try:
            vat = decimal_value(data.get("vat_percent", "7.5"), name="VAT", maximum=Decimal("100"))
        except ValueError as exc:
            fields["vat_percent"] = str(exc)
            vat = Decimal("0")
        if fields:
            return api_error("validation_error", "Please correct the highlighted fields.", 400, fields)
        tariff = Tariff(name=name, rate_per_kwh=rate, fixed_charge=fixed, vat_percent=vat, is_active=bool(data.get("is_active", True)))
        db.session.add(tariff)
        db.session.commit()
        audit_event("tariff_created", actor_id=current_user().id, target_type="tariff", target_id=tariff.id, details={"after": tariff_json(tariff)})
        return jsonify({"tariff": tariff_json(tariff)}), 201

    try:
        tariff_id = parse_db_id(data.get("id"), field="Tariff ID")
    except ValueError:
        tariff_id = None
    tariff = db.session.get(Tariff, tariff_id) if tariff_id else None
    if tariff is None:
        return api_error("not_found", "Tariff was not found.", 404)
    before = tariff_json(tariff)
    allowed = {"id", "name", "rate_per_kwh", "fixed_charge", "vat_percent", "is_active"}
    unknown = set(data) - allowed
    if unknown:
        return api_error("validation_error", f"Unsupported field: {sorted(unknown)[0]}", 400)
    try:
        if "name" in data:
            tariff.name = clean_text(data["name"], max_length=100)
        if "rate_per_kwh" in data:
            tariff.rate_per_kwh = decimal_value(data["rate_per_kwh"], name="Rate", maximum=Decimal("1000000"))
        if "fixed_charge" in data:
            tariff.fixed_charge = decimal_value(data["fixed_charge"], name="Fixed charge", maximum=Decimal("100000000"))
        if "vat_percent" in data:
            tariff.vat_percent = decimal_value(data["vat_percent"], name="VAT", maximum=Decimal("100"))
    except ValueError as exc:
        return api_error("validation_error", str(exc), 400)
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            return api_error("validation_error", "is_active must be boolean.", 400)
        tariff.is_active = data["is_active"]
    db.session.commit()
    after = tariff_json(tariff)
    audit_event("tariff_updated", actor_id=current_user().id, target_type="tariff", target_id=tariff.id, details={"before": before, "after": after})
    return jsonify({"tariff": after})


@admin_bp.get("/audit")
@roles_required("admin")
def audit():
    try:
        reject_unknown_query_args({"action", "page"})
        page = parse_page(request.args.get("page"))
    except ValueError as exc:
        return api_error("invalid_filter", str(exc), 400)
    stmt = select(AuditLog)
    action = (request.args.get("action") or "").strip()
    if action:
        if len(action) > 80:
            return api_error("invalid_filter", "Action filter is too long.", 400)
        stmt = stmt.where(AuditLog.action == action)
    stmt = stmt.order_by(AuditLog.created_at.desc())
    pagination = db.paginate(stmt, page=page, per_page=PER_PAGE, error_out=False)
    items = [
        {
            "id": a.id,
            "actor_id": a.actor_id,
            "action": a.action,
            "target_type": a.target_type,
            "target_id": a.target_id,
            "ip_address": str(a.ip_address) if a.ip_address is not None else None,
            "details": a.details,
            "created_at": a.created_at.isoformat(),
        }
        for a in pagination.items
    ]
    return jsonify({"items": items, "page": page, "pages": pagination.pages, "total": pagination.total})
