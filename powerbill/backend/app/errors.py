from __future__ import annotations

from flask import current_app
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException

from .extensions import db
from .utils import api_error


def register_error_handlers(app) -> None:
    @app.errorhandler(IntegrityError)
    def integrity_error(_exc):
        db.session.rollback()
        return api_error("conflict", "That operation conflicts with an existing record.", 409)

    @app.errorhandler(HTTPException)
    def http_error(exc: HTTPException):
        return api_error("http_error", exc.description or "Request failed.", exc.code or 500)

    @app.errorhandler(Exception)
    def unexpected_error(exc: Exception):
        db.session.rollback()
        current_app.logger.exception("Unhandled API error", exc_info=exc)
        return api_error("internal_error", "An internal server error occurred.", 500)
