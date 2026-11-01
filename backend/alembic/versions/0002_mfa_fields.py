"""Add MFA fields to users table (task 1.5).

Adds mfa_secret_enc, mfa_qr_enc, mfa_backup_codes_enc, mfa_enabled_at,
and mfa_verified_at columns to the users table.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = "0002_mfa_fields"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("mfa_secret_enc", sa.Text(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("mfa_qr_enc", sa.Text(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("mfa_backup_codes_enc", sa.Text(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("mfa_enabled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("mfa_verified_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "mfa_verified_at")
    op.drop_column("users", "mfa_enabled_at")
    op.drop_column("users", "mfa_backup_codes_enc")
    op.drop_column("users", "mfa_qr_enc")
    op.drop_column("users", "mfa_secret_enc")
