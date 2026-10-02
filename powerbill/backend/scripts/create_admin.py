from __future__ import annotations

import getpass
import os
import sys

from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hash_password  # noqa: E402
from app.utils import normalized_email, password_errors, valid_email  # noqa: E402


def main() -> None:
    app = create_app(os.getenv("FLASK_ENV", "production"))
    with app.app_context():
        email = normalized_email(input("Admin email: "))
        if not valid_email(email):
            raise SystemExit("Invalid email.")
        if db.session.scalar(select(User.id).where(User.email == email)):
            raise SystemExit("A user with that email already exists.")
        full_name = input("Full name: ").strip()
        if not full_name or len(full_name) > 120:
            raise SystemExit("Full name is required and must be <=120 characters.")
        password = getpass.getpass("Password: ")
        errors = password_errors(password)
        if errors:
            raise SystemExit(" ".join(errors))
        user = User(email=email, full_name=full_name, password_hash=hash_password(password), role="admin")
        db.session.add(user)
        db.session.commit()
        print(f"Created admin {email} ({user.id}).")


if __name__ == "__main__":
    main()
