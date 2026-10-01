from __future__ import annotations

import re
from datetime import date
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit

from flask import jsonify, request

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def api_error(code: str, message: str, status: int, fields: dict | None = None):
    body: dict = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    return jsonify(body), status


def page_response(items: list[dict], page: int, pages: int, total: int):
    return jsonify({"items": items, "page": page, "pages": pages, "total": total})


def normalized_email(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip().lower()


def valid_email(value: str) -> bool:
    return bool(EMAIL_RE.fullmatch(value)) and len(value) <= 254


def password_errors(password: object) -> list[str]:
    if not isinstance(password, str):
        return ["Password is required."]
    errors: list[str] = []
    encoded = password.encode("utf-8")
    if len(password) < 10:
        errors.append("Use at least 10 characters.")
    if len(encoded) > 72:
        errors.append("Password must be at most 72 UTF-8 bytes for bcrypt.")
    if not any(ch.isupper() for ch in password):
        errors.append("Add at least one uppercase letter.")
    if not any(ch.islower() for ch in password):
        errors.append("Add at least one lowercase letter.")
    if not any(ch.isdigit() for ch in password):
        errors.append("Add at least one digit.")
    return errors


def clean_text(value: object, *, max_length: int, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise ValueError("Must be text.")
    value = " ".join(value.strip().split())
    if not value and not allow_empty:
        raise ValueError("This field is required.")
    if len(value) > max_length:
        raise ValueError(f"Must be at most {max_length} characters.")
    return value


def clean_multiline(value: object, *, max_length: int) -> str:
    if not isinstance(value, str):
        raise ValueError("Must be text.")
    value = value.strip().replace("\x00", "")
    if not value:
        raise ValueError("This field is required.")
    if len(value) > max_length:
        raise ValueError(f"Must be at most {max_length} characters.")
    return value


def decimal_value(value: object, *, name: str, maximum: Decimal | None = None) -> Decimal:
    if isinstance(value, bool):
        raise ValueError(f"{name} must be a number.")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError(f"{name} must be a valid number.") from exc
    if not result.is_finite():
        raise ValueError(f"{name} must be finite.")
    if result < 0:
        raise ValueError(f"{name} cannot be negative.")
    if maximum is not None and result > maximum:
        raise ValueError(f"{name} is too large.")
    return result


def parse_month(value: str | None) -> date | None:
    if not value:
        return None
    if not re.fullmatch(r"\d{4}-\d{2}", value):
        raise ValueError("Month must use YYYY-MM format.")
    year, month = map(int, value.split("-"))
    return date(year, month, 1)


def parse_page(value: str | None) -> int:
    if value is None:
        return 1
    if not value.isdigit():
        raise ValueError("Page must be a positive integer.")
    page = int(value)
    if page < 1 or page > 100000:
        raise ValueError("Page is out of range.")
    return page


def reject_unknown_query_args(allowed: set[str]) -> None:
    unknown = set(request.args.keys()) - allowed
    if unknown:
        raise ValueError(f"Unsupported query parameter: {sorted(unknown)[0]}")


def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def safe_relative_path(value: object) -> str | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError("Redirect path must be text.")
    if "\\" in value or "\r" in value or "\n" in value:
        raise ValueError("Redirect path must be a same-site relative path.")
    parts = urlsplit(value)
    if parts.scheme or parts.netloc or not value.startswith("/") or value.startswith("//"):
        raise ValueError("Redirect path must be a same-site relative path.")
    return value


def parse_db_id(value: object, *, field: str = "ID") -> int:
    if isinstance(value, bool):
        raise ValueError(f"{field} must be a positive integer.")
    if isinstance(value, int):
        parsed = value
    elif isinstance(value, str) and value.isdigit():
        parsed = int(value)
    else:
        raise ValueError(f"{field} must be a positive integer.")
    if parsed < 1:
        raise ValueError(f"{field} must be a positive integer.")
    return parsed
