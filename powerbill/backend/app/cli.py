from __future__ import annotations

from datetime import date

import click
from flask import Flask
from sqlalchemy import update

from .extensions import db
from .models import Bill


def register_cli(app: Flask) -> None:
    @app.cli.command("mark-overdue")
    def mark_overdue():
        """Persist overdue status for unpaid bills past their due date."""
        result = db.session.execute(
            update(Bill)
            .where(Bill.status == "unpaid", Bill.due_date < date.today())
            .values(status="overdue")
        )
        db.session.commit()
        click.echo(f"Marked {result.rowcount or 0} bill(s) overdue.")
