"""Async database session management for backend persistence."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from config import settings


class DatabaseManager:
    """Lazy async engine/session manager.

    The engine is intentionally created lazily so local development can keep using
    the backend without requiring a live database until persistence features are
    explicitly enabled and exercised.
    """

    def __init__(self) -> None:
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker[AsyncSession]] = None

    @property
    def enabled(self) -> bool:
        return settings.BIOFIELD_PERSISTENCE_ENABLED and bool(settings.DATABASE_URL)

    def get_engine(self) -> AsyncEngine:
        if self._engine is None:
            self._engine = create_async_engine(
                settings.DATABASE_URL,
                echo=settings.DATABASE_ECHO,
                pool_pre_ping=True,
                future=True,
            )
        return self._engine

    def get_session_factory(self) -> async_sessionmaker[AsyncSession]:
        if self._session_factory is None:
            self._session_factory = async_sessionmaker(
                bind=self.get_engine(),
                expire_on_commit=False,
                class_=AsyncSession,
            )
        return self._session_factory

    @asynccontextmanager
    async def session_scope(self) -> AsyncIterator[AsyncSession]:
        session_factory = self.get_session_factory()
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def healthcheck(self) -> dict:
        if not self.enabled:
            return {"enabled": False, "healthy": False, "reason": "persistence_disabled"}

        try:
            async with self.session_scope() as session:
                await session.execute(text("select 1"))
            return {"enabled": True, "healthy": True}
        except Exception as exc:  # pragma: no cover - defensive operational path
            return {
                "enabled": True,
                "healthy": False,
                "reason": exc.__class__.__name__,
                "detail": str(exc),
            }

    async def dispose(self) -> None:
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None


database_manager = DatabaseManager()


@asynccontextmanager
async def get_session_scope() -> AsyncIterator[AsyncSession]:
    """Convenience context manager for service-layer persistence flows."""

    async with database_manager.session_scope() as session:
        yield session


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency for async DB sessions."""

    async with database_manager.session_scope() as session:
        yield session
