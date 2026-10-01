from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request, session
from sqlalchemy import select

from ..extensions import db
from ..models import CustomerProfile, User
from ..security import (
    current_user,
    hash_password,
    issue_csrf_token,
    login_ip_rate_limited,
    login_required,
    verify_password,
)
from ..serializers import user_json
from ..services.audit import audit_event
from ..utils import api_error, clean_text, normalized_email, password_errors, safe_relative_path, valid_email

auth_bp = Blueprint("auth", __name__)



@auth_bp.get("/csrf")
def csrf():
    return jsonify({"csrf_token": issue_csrf_token()})


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = normalized_email(data.get("email"))
    password = data.get("password")
    fields: dict[str, str] = {}
    if not valid_email(email):
        fields["email"] = "Enter a valid email address."
    pw_errors = password_errors(password)
    if pw_errors:
        fields["password"] = " ".join(pw_errors)
    try:
        full_name = clean_text(data.get("full_name"), max_length=120)
    except ValueError as exc:
        full_name = ""
        fields["full_name"] = str(exc)
    try:
        next_path = safe_relative_path(data.get("next"))
    except ValueError as exc:
        fields["next"] = str(exc)
        next_path = None
    if fields:
        return api_error("validation_error", "Please correct the highlighted fields.", 400, fields)

    if db.session.scalar(select(User.id).where(User.email == email)):
        return api_error("email_in_use", "An account already exists for that email.", 409, {"email": "Already registered."})

    user = User(email=email, password_hash=hash_password(password), full_name=full_name, role="customer")
    db.session.add(user)
    db.session.flush()
    profile = CustomerProfile(user_id=user.id)
    db.session.add(profile)
    db.session.commit()
    audit_event("user_registered", actor_id=user.id, target_type="user", target_id=user.id)
    return jsonify({"user": user_json(user), "next": next_path}), 201


@auth_bp.post("/login")
def login():
    if login_ip_rate_limited():
        audit_event("login_rate_limited", target_type="route", target_id=request.path)
        return api_error("rate_limited", "Too many login attempts. Try again shortly.", 429)

    data = request.get_json(silent=True) or {}
    email = normalized_email(data.get("email"))
    password = data.get("password") if isinstance(data.get("password"), str) else ""
    try:
        next_path = safe_relative_path(data.get("next"))
    except ValueError:
        next_path = None

    user = db.session.scalar(select(User).where(User.email == email)) if email else None
    password_ok = verify_password(password, user.password_hash if user else None)
    now = datetime.now(timezone.utc)

    locked = False
    if user and user.locked_until:
        locked_until = user.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        locked = locked_until > now

    valid = bool(user and user.is_active and password_ok and not locked)
    if not valid:
        if user and not locked:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= current_app.config["LOGIN_FAILURE_LIMIT"]:
                user.locked_until = now + timedelta(minutes=current_app.config["LOGIN_LOCK_MINUTES"])
            db.session.commit()
        audit_event(
            "login_failed",
            actor_id=user.id if user else None,
            target_type="auth",
            details={"known_account": bool(user)},
        )
        return api_error("invalid_credentials", "Email or password is incorrect.", 401)

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    db.session.commit()

    # A clean session prevents carrying pre-login identity state forward (session fixation defense).
    session.clear()
    session["user_id"] = user.id
    session["role"] = user.role
    session["csrf_token"] = secrets.token_urlsafe(32)
    session.permanent = True
    audit_event("login_success", actor_id=user.id, target_type="user", target_id=user.id)
    return jsonify({"user": user_json(user), "csrf_token": session["csrf_token"], "next": next_path})


@auth_bp.post("/logout")
@login_required
def logout():
    user = current_user()
    user_id = user.id if user else None
    session.clear()
    audit_event("logout", actor_id=user_id, target_type="user", target_id=user_id)
    return jsonify({"ok": True})


@auth_bp.get("/me")
def me():
    user = current_user()
    if user is None:
        return api_error("authentication_required", "Authentication is required.", 401)
    return jsonify({"user": user_json(user)})
