"""
Database session management for per-user encrypted storage.

Replaces the legacy JSON-file store with a relational database so that
per-user data can be isolated with row-level security and field-level
encryption. PostgreSQL is the production target; SQLite is supported for
local development and tests.

Configure via DATABASE_URL (e.g. postgresql+psycopg2://user:pass@host:5432/db
or sqlite+aiosqlite:///./data/dev.db).
"""
from __future__ import annotations

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./data/dev.db",
)

#: `echo=True` in development to surface SQL; false in production.
SQL_ECHO = os.getenv("SQL_ECHO", "false").strip().lower() == "true"

engine = create_async_engine(DATABASE_URL, echo=SQL_ECHO, pool_pre_ping=True)

#: Session factory — call `async_session()` to get an `AsyncSession`.
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a scoped async session."""
    async with async_session() as session:
        yield session


async def init_db() -> None:
    """Create all tables defined on `Base.metadata`.

    Intended for local dev and tests. Production uses Alembic migrations
    instead of create_all.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_db() -> None:
    """Dispose the engine connection pool (useful in tests/shutdown)."""
    await engine.dispose()
