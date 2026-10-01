from __future__ import annotations

import os

from flask import Flask, jsonify, request

from .blueprints.admin import admin_bp
from .blueprints.auth import auth_bp
from .blueprints.me import me_bp
from .blueprints.public import public_bp
from .blueprints.staff import staff_bp
from .cli import register_cli
from .config import CONFIGS
from .errors import register_error_handlers
from .extensions import db
from .security import validate_csrf_and_origin


def create_app(config_name: str | None = None) -> Flask:
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    config_cls = CONFIGS.get(config_name)
    if config_cls is None:
        raise RuntimeError(f"Unknown configuration: {config_name}")

    app = Flask(__name__)
    app.config.from_object(config_cls)
    config_cls.load_runtime(app)

    db.init_app(app)
    register_error_handlers(app)
    register_cli(app)

    @app.before_request
    def csrf_origin_guard():
        return validate_csrf_and_origin()

    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # The full nonce-based CSP is owned by Next.js proxy.ts. The JSON API still blocks framing.
        response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"
        if request.path.startswith("/api/v1/") and request.path not in {"/api/v1/public/tariffs", "/api/v1/public/stats"}:
            response.headers["Cache-Control"] = "no-store"
        if app.config["ENV_NAME"] == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.get("/health")
    def health():
        return jsonify({"ok": True})

    app.register_blueprint(public_bp, url_prefix="/api/v1/public")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(me_bp, url_prefix="/api/v1/me")
    app.register_blueprint(staff_bp, url_prefix="/api/v1/staff")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    return app
