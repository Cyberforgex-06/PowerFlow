from __future__ import annotations

import hmac
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt
from flask import current_app, g, request, session
from sqlalchemy import func, select

from .extensions import db
from .models import AuditLog, User
from .services.audit import audit_event
from .utils import api_error

# Constant hash prevents a fast "unknown user" branch during login.
# It is generated once at process start using the same 12-round bcrypt cost.
DUMMY_PASSWORD_HASH = bcrypt.hashpw(b"PowerBill-Dummy-Password-Only", bcrypt.gensalt(rounds=12))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    encoded = password.encode("utf-8")
    candidate = password_hash.encode("utf-8") if password_hash else DUMMY_PASSWORD_HASH
    try:
        return bcrypt.checkpw(encoded, candidate)
    except (ValueError, TypeError):
        # bcrypt 5 raises ValueError for >72 bytes; validation rejects it before normal auth.
        return False


def current_user() -> User | None:
    if hasattr(g, "current_user"):
        return g.current_user
    user_id = session.get("user_id")
    user = db.session.get(User, user_id) if user_id else None
    if user is not None and not user.is_active:
        session.clear()
        user = None
    g.current_user = user
    return user


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if user is None:
            return api_error("authentication_required", "Authentication is required.", 401)
        return view(*args, **kwargs)

    return wrapped


def roles_required(*roles: str):
    allowed = set(roles)

    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = current_user()
            if user is None:
                return api_error("authentication_required", "Authentication is required.", 401)
            if user.role not in allowed:
                audit_event(
                    "access_denied",
                    actor_id=user.id,
                    target_type="route",
                    target_id=request.path,
                    details={"required_roles": sorted(allowed), "actual_role": user.role},
                )
                return api_error("forbidden", "You do not have permission to perform this action.", 403)
            return view(*args, **kwargs)

        return wrapped

    return decorator


def issue_csrf_token() -> str:
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
        session.permanent = True
    return token


def validate_csrf_and_origin():
    if request.method not in {"POST", "PATCH", "DELETE", "PUT"}:
        return None

    origin = (request.headers.get("Origin") or "").rstrip("/")
    allowed_origins = current_app.config["ALLOWED_ORIGINS"]
    if origin not in allowed_origins:
        audit_event(
            "csrf_origin_rejected",
            actor_id=session.get("user_id"),
            target_type="route",
            target_id=request.path,
            details={"origin_present": bool(origin)},
        )
        return api_error("invalid_origin", "Request origin was not accepted.", 403)

    supplied = request.headers.get("X-CSRF-Token", "")
    expected = session.get("csrf_token", "")
    if not supplied or not expected or not hmac.compare_digest(supplied, expected):
        audit_event(
            "csrf_token_rejected",
            actor_id=session.get("user_id"),
            target_type="route",
            target_id=request.path,
        )
        return api_error("csrf_failed", "CSRF validation failed.", 403)
    return None


def login_ip_rate_limited() -> bool:
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()[:64]
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=1)
    count = db.session.scalar(
        select(func.count(AuditLog.id)).where(
            AuditLog.action.in_(["login_failed", "login_success"]),
            AuditLog.ip_address == ip,
            AuditLog.created_at >= cutoff,
        )
    )
    return int(count or 0) >= int(current_app.config["LOGIN_RATE_LIMIT_PER_MINUTE"])
