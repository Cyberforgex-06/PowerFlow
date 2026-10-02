from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .extensions import db


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


BIGINT_PK = db.BigInteger().with_variant(db.Integer, "sqlite")
INET_PORTABLE = INET().with_variant(db.String(64), "sqlite")
JSON_PORTABLE = JSONB().with_variant(db.JSON(), "sqlite")


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    full_name: Mapped[str] = mapped_column(db.String(120), nullable=False)
    email: Mapped[str] = mapped_column(db.String(254), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(db.Text, nullable=False)
    role: Mapped[str] = mapped_column(db.String(24), nullable=False, default="customer", index=True)
    is_active: Mapped[bool] = mapped_column(db.Boolean, nullable=False, default=True)
    failed_login_attempts: Mapped[int] = mapped_column(db.Integer, nullable=False, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    customer_profile: Mapped["CustomerProfile | None"] = relationship(back_populates="user", uselist=False)

    __table_args__ = (
        CheckConstraint("role IN ('admin','billing_officer','customer')", name="ck_users_role"),
        CheckConstraint("failed_login_attempts >= 0", name="ck_users_failed_login_nonnegative"),
    )


class CustomerProfile(db.Model):
    __tablename__ = "customer_profiles"

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    phone: Mapped[str | None] = mapped_column(db.String(24), nullable=True)
    address: Mapped[str | None] = mapped_column(db.Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="customer_profile")


class Tariff(db.Model):
    __tablename__ = "tariffs"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(db.String(100), nullable=False, unique=True)
    rate_per_kwh: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    fixed_charge: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False, default=Decimal("0"))
    vat_percent: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False, default=Decimal("7.5"))
    is_active: Mapped[bool] = mapped_column(db.Boolean, nullable=False, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    __table_args__ = (
        CheckConstraint("rate_per_kwh >= 0", name="ck_tariffs_rate_nonnegative"),
        CheckConstraint("fixed_charge >= 0", name="ck_tariffs_fixed_nonnegative"),
        CheckConstraint("vat_percent >= 0 AND vat_percent <= 100", name="ck_tariffs_vat_range"),
    )


class Meter(db.Model):
    __tablename__ = "meters"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    meter_number: Mapped[str] = mapped_column(db.String(48), unique=True, nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    tariff_id: Mapped[int] = mapped_column(ForeignKey("tariffs.id"), nullable=False, index=True)
    address: Mapped[str] = mapped_column(db.Text, nullable=False, default="Not provided")
    status: Mapped[str] = mapped_column(db.String(24), nullable=False, default="active")
    installed_at: Mapped[date] = mapped_column(db.Date, nullable=False, default=date.today)

    customer: Mapped[User] = relationship(foreign_keys=[customer_id])
    tariff: Mapped[Tariff] = relationship()
    readings: Mapped[list["MeterReading"]] = relationship(
        back_populates="meter", order_by="(MeterReading.billing_period, MeterReading.created_at)"
    )

    @property
    def is_active(self) -> bool:
        return self.status == "active"

    @property
    def assigned_at(self) -> date:
        return self.installed_at

    @property
    def opening_reading(self) -> Decimal:
        return Decimal(self.readings[0].reading_kwh) if self.readings else Decimal("0")

    __table_args__ = (
        CheckConstraint("status IN ('active','suspended','disconnected')", name="ck_meters_status"),
    )


class MeterReading(db.Model):
    __tablename__ = "meter_readings"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey("meters.id"), nullable=False, index=True)
    reading_kwh: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    billing_period: Mapped[date] = mapped_column(db.Date, nullable=False, index=True)
    submitted_by: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    meter: Mapped[Meter] = relationship(back_populates="readings")

    __table_args__ = (
        UniqueConstraint("meter_id", "billing_period", name="uq_meter_reading_period"),
        CheckConstraint("reading_kwh >= 0", name="ck_meter_readings_nonnegative"),
    )


class Bill(db.Model):
    __tablename__ = "bills"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey("meters.id"), nullable=False, index=True)
    reading_id: Mapped[int] = mapped_column(ForeignKey("meter_readings.id"), unique=True, nullable=False)
    billing_period: Mapped[date] = mapped_column(db.Date, nullable=False, index=True)
    previous_reading: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    current_reading: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    units_consumed: Mapped[Decimal] = mapped_column(db.Numeric, nullable=True)
    rate_per_kwh: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    fixed_charge: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    vat_percent: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    energy_charge: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    vat_amount: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    status: Mapped[str] = mapped_column(db.String(16), nullable=False, default="unpaid", index=True)
    due_date: Mapped[date] = mapped_column(db.Date, nullable=False, index=True)
    generated_by: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    meter: Mapped[Meter] = relationship()
    reading: Mapped[MeterReading] = relationship()
    payments: Mapped[list["Payment"]] = relationship(back_populates="bill", order_by="Payment.created_at")

    @property
    def customer_id(self) -> str:
        return self.meter.customer_id

    @property
    def billing_month(self) -> date:
        return self.billing_period

    @property
    def units(self) -> Decimal:
        return Decimal(self.units_consumed or (self.current_reading - self.previous_reading))

    @property
    def subtotal(self) -> Decimal:
        return Decimal(self.energy_charge) + Decimal(self.fixed_charge)

    @property
    def created_at(self) -> datetime:
        return self.generated_at

    @property
    def paid_at(self) -> datetime | None:
        for payment in reversed(self.payments):
            if payment.status == "successful" and payment.paid_at:
                return payment.paid_at
        return None

    __table_args__ = (
        UniqueConstraint("meter_id", "billing_period", name="uq_bill_meter_period"),
        CheckConstraint("current_reading >= previous_reading", name="ck_bills_readings"),
        CheckConstraint("total_amount >= 0", name="ck_bills_total_nonnegative"),
        CheckConstraint("status IN ('unpaid','paid','overdue')", name="ck_bills_status"),
    )


class Payment(db.Model):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    bill_id: Mapped[int] = mapped_column(ForeignKey("bills.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(db.Numeric, nullable=False)
    method: Mapped[str] = mapped_column(db.String(24), nullable=False)
    reference: Mapped[str] = mapped_column(db.String(32), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(db.String(16), nullable=False, default="pending")
    paid_at: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True), nullable=True)
    recorded_by: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    bill: Mapped[Bill] = relationship(back_populates="payments")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        CheckConstraint("method IN ('card','bank_transfer','ussd','cash')", name="ck_payments_method"),
        CheckConstraint("status IN ('pending','successful','failed')", name="ck_payments_status"),
    )


class Complaint(db.Model):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    bill_id: Mapped[int | None] = mapped_column(ForeignKey("bills.id"), nullable=True, index=True)
    customer_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(db.String(160), nullable=False)
    message: Mapped[str] = mapped_column(db.Text, nullable=False)
    status: Mapped[str] = mapped_column(db.String(24), nullable=False, default="open", index=True)
    response: Mapped[str | None] = mapped_column(db.Text, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True), nullable=True)

    @property
    def category(self) -> str:
        return "billing"

    @property
    def responded_by(self) -> str | None:
        return self.resolved_by

    @property
    def updated_at(self) -> datetime:
        return self.resolved_at or self.created_at

    __table_args__ = (
        CheckConstraint("status IN ('open','in_review','resolved','rejected')", name="ck_complaints_status"),
    )


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    actor_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(db.String(80), nullable=False, index=True)
    entity: Mapped[str | None] = mapped_column(db.String(50), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(db.String(64), nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(INET_PORTABLE, nullable=True, index=True)
    user_agent: Mapped[str | None] = mapped_column(db.Text, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON_PORTABLE, nullable=True)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)

    @property
    def target_type(self) -> str | None:
        return self.entity

    @property
    def target_id(self) -> str | None:
        return self.entity_id
