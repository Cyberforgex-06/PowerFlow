from __future__ import annotations

from flask import has_request_context, request

from ..extensions import db
from ..models import AuditLog


def audit_event(
    action: str,
    *,
    actor_id: str | None = None,
    target_type: str | None = None,
    target_id: str | int | None = None,
    details: dict | None = None,
    commit: bool = True,
) -> None:
    ip = None
    agent = None
    if has_request_context():
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()[:64] or None
        agent = request.headers.get("User-Agent", "")[:255] or None
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity=target_type,
        entity_id=str(target_id) if target_id is not None else None,
        ip_address=ip,
        user_agent=agent,
        details=details,
    )
    db.session.add(entry)
    if commit:
        db.session.commit()
