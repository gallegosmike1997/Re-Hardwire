"""Alembic migration environment for Re-Hardwire.

Uses the async SQLAlchemy engine from :mod:`app.core.database`. Migrations run
in a sync context via ``run_sync`` so Alembic's standard offline/online modes
work unchanged.
"""
from __future__ import annotations

import os
import sys

# Ensure the backend package (``app``) is importable when Alembic is invoked
# from the backend directory.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool

from app.core.database import Base, DATABASE_URL  # noqa: E402
from app.core import models  # noqa: E402  # ensure all models are registered

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override the SQLAlchemy URL from the environment (DATABASE_URL) so Alembic
# targets the same database as the running application.
config.set_main_option("sqlalchemy.url", DATABASE_URL)

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine, though an
    Engine is acceptable here as well.  By skipping the Engine creation we
    don't even need a DBAPI to be available.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=True,  # SQLite-compatible batch alterations
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates a synchronous engine (driver-converted from the async DATABASE_URL)
    so Alembic's standard connection context manager works.
    """
    from app.core.database import DATABASE_URL  # noqa: E402

    from sqlalchemy import create_engine

    # Convert async driver URLs to sync equivalents for Alembic.
    sync_url = DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "")
    connectable = create_engine(sync_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
