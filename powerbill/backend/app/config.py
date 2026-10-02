from __future__ import annotations

import os
import secrets
from datetime import timedelta


def _bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _origins() -> set[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    return {item.strip().rstrip("/") for item in raw.split(",") if item.strip()}


class BaseConfig:
    ENV_NAME = "base"
    TESTING = False
    DEBUG = False

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    SESSION_COOKIE_NAME = "powerbill_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    SESSION_REFRESH_EACH_REQUEST = False

    MAX_CONTENT_LENGTH = 256 * 1024
    JSON_SORT_KEYS = False

    ALLOWED_ORIGINS = _origins()
    LOGIN_RATE_LIMIT_PER_MINUTE = int(os.getenv("LOGIN_RATE_LIMIT_PER_MINUTE", "10"))
    LOGIN_FAILURE_LIMIT = int(os.getenv("LOGIN_FAILURE_LIMIT", "5"))
    LOGIN_LOCK_MINUTES = int(os.getenv("LOGIN_LOCK_MINUTES", "15"))

    @classmethod
    def load_runtime(cls, app) -> None:
        app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "")
        db_url = os.getenv(
            "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/powerbill"
        )
        # Supabase often displays a generic postgresql:// URI. Force Psycopg 3,
        # the driver pinned by this project, rather than relying on psycopg2 defaults.
        if db_url.startswith("postgres://"):
            db_url = "postgresql://" + db_url[len("postgres://"):]
        if db_url.startswith("postgresql://"):
            db_url = "postgresql+psycopg://" + db_url[len("postgresql://"):]
        app.config["SQLALCHEMY_DATABASE_URI"] = db_url


class DevelopmentConfig(BaseConfig):
    ENV_NAME = "development"
    DEBUG = True
    SESSION_COOKIE_SECURE = _bool("COOKIE_SECURE", False)

    @classmethod
    def load_runtime(cls, app) -> None:
        super().load_runtime(app)
        if not app.config["SECRET_KEY"]:
            app.config["SECRET_KEY"] = secrets.token_hex(32)


class TestingConfig(BaseConfig):
    ENV_NAME = "testing"
    TESTING = True
    SESSION_COOKIE_SECURE = False
    SQLALCHEMY_DATABASE_URI = "sqlite+pysqlite:///:memory:"
    SECRET_KEY = "test-only-secret-key-that-is-long-enough"
    ALLOWED_ORIGINS = {"http://localhost"}
    LOGIN_RATE_LIMIT_PER_MINUTE = 100

    @classmethod
    def load_runtime(cls, app) -> None:
        app.config["SECRET_KEY"] = cls.SECRET_KEY
        app.config["SQLALCHEMY_DATABASE_URI"] = cls.SQLALCHEMY_DATABASE_URI


class ProductionConfig(BaseConfig):
    ENV_NAME = "production"

    @classmethod
    def load_runtime(cls, app) -> None:
        super().load_runtime(app)
        secret = app.config.get("SECRET_KEY", "")
        if len(secret) < 32:
            raise RuntimeError("Production SECRET_KEY must be set and at least 32 characters long.")
        db_url = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        if not os.getenv("DATABASE_URL"):
            raise RuntimeError("Production DATABASE_URL must be explicitly configured.")
        if not db_url.startswith(("postgresql://", "postgresql+psycopg://")):
            raise RuntimeError("Production DATABASE_URL must be PostgreSQL.")


CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
