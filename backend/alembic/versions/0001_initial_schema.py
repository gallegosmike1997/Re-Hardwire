"""Initial schema for per-user encrypted storage.

Creates users, profiles, history_entries, refresh_tokens, audit_events, and
abuse_records tables with subject_id foreign keys and indexes.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("provider_sub", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_sub", name="uq_users_provider_sub"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_provider_sub", "users", ["provider_sub"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_table(
        "profiles",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name_enc", sa.Text(), nullable=True),
        sa.Column("email_enc", sa.Text(), nullable=True),
        sa.Column("preferences_enc", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["subject_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("subject_id", name="uq_profiles_subject_id"),
    )
    op.create_index("ix_profiles_subject_id", "profiles", ["subject_id"], unique=False)

    op.create_table(
        "history_entries",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", sa.String(length=100), nullable=False),
        sa.Column("messages_enc", sa.Text(), nullable=True),
        sa.Column("protocol_used", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["subject_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_history_entries_subject_id", "history_entries", ["subject_id"], unique=False)
    op.create_index(
        "ix_history_entries_subject_session",
        "history_entries",
        ["subject_id", "session_id"],
        unique=False,
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["subject_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_refresh_tokens_subject_id", "refresh_tokens", ["subject_id"], unique=False)
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=False)

    op.create_table(
        "audit_events",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("details_enc", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["subject_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_subject_id", "audit_events", ["subject_id"], unique=False)
    op.create_index("ix_audit_events_action", "audit_events", ["action"], unique=False)
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"], unique=False)

    op.create_table(
        "abuse_records",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", UUID(as_uuid=True), nullable=True),
        sa.Column("client_ip", sa.String(length=45), nullable=True),
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("banned_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_abuse_records_subject_id", "abuse_records", ["subject_id"], unique=False)
    op.create_index("ix_abuse_records_client_ip", "abuse_records", ["client_ip"], unique=False)
    op.create_index(
        "ix_abuse_records_subject_ip",
        "abuse_records",
        ["subject_id", "client_ip"],
        unique=False,
    )

def downgrade() -> None:
    op.drop_index("ix_abuse_records_subject_ip", table_name="abuse_records")
    op.drop_index("ix_abuse_records_client_ip", table_name="abuse_records")
    op.drop_index("ix_abuse_records_subject_id", table_name="abuse_records")
    op.drop_table("abuse_records")

    op.drop_index("ix_audit_events_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_action", table_name="audit_events")
    op.drop_index("ix_audit_events_subject_id", table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_subject_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_history_entries_subject_session", table_name="history_entries")
    op.drop_index("ix_history_entries_subject_id", table_name="history_entries")
    op.drop_table("history_entries")

    op.drop_index("ix_profiles_subject_id", table_name="profiles")
    op.drop_table("profiles")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_provider_sub", table_name="users")
    op.drop_table("users")

