"""
SQLAlchemy models for per-user encrypted storage.

All user-owned tables carry ``subject_id`` so Row-Level Security policies can
isolate rows to their owning subject. Sensitive text fields are stored
encrypted at rest (see :mod:`app.core.encryption`).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone


from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    """A registered user identity (replaces anonymous device subject)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    #: OIDC/OAuth2 subject identifier from the identity provider.
    provider_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    #: Normalized email (lowercased) for lookup; nullable for anonymous subjects.
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    #: Whether MFA is enrolled for this user.
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    #: Encrypted TOTP secret (Base32).
    mfa_secret_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Encrypted QR provisioning URI.
    mfa_qr_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Encrypted backup codes (pipe-separated).
    mfa_backup_codes_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Timestamp when MFA was first enabled.
    mfa_enabled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    #: Timestamp of last successful MFA verification.
    mfa_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    #: Soft-delete timestamp; set when account is deleted (task 3.1).
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    profile: Mapped["Profile" | None] = relationship(
        "Profile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    history: Mapped[list["HistoryEntry"]] = relationship(
        "HistoryEntry", back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="user", cascade="all, delete-orphan"
    )
class Profile(Base):
    """Per-user profile, scoped to one user."""

    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    #: Encrypted display name.
    name_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    #: Encrypted email (may duplicate users.email for verified claims).
    email_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    #: Encrypted JSON blob of preferences.
    preferences_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")

    __table_args__ = (
        UniqueConstraint("subject_id", name="uq_profiles_subject_id"),
    )


class HistoryEntry(Base):
    """Per-user conversation/session history entry."""

    __tablename__ = "history_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    #: Encrypted JSON blob of messages.
    messages_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    protocol_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="history")

    __table_args__ = (
        Index("ix_history_subject_session", "subject_id", "session_id"),
    )


class RefreshToken(Base):
    """Persisted refresh token for JWT rotation and revocation (task 1.4)."""

    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    #: Hashed token value (we store hashes, never plaintext tokens).
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")


class AuditEvent(Base):
    """Immutable append-only audit log (task 3.5)."""

    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    #: PII-redacted details as JSON text.
    details_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    user: Mapped["User" | None] = relationship("User", back_populates="audit_events")


class AbuseRecord(Base):
    """Per-subject/IP abuse tracking for lockouts and bans (task 4.x)."""

    __tablename__ = "abuse_records"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    #: Either a subject_id or a client IP; exactly one is set.
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    client_ip: Mapped[str | None] = mapped_column(String(45), nullable=True, index=True)
    #: Number of consecutive failed attempts.
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    #: Lockout expires_at (null when not locked).
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    #: Temporary ban expires_at (null when not banned).
    banned_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_abuse_subject_ip", "subject_id", "client_ip"),
    )

