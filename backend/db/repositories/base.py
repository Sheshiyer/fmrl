"""Shared repository helpers for async SQL access."""
from __future__ import annotations

import json
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.engine import RowMapping


class RepositoryError(RuntimeError):
    """Raised when repository-level invariants are violated."""


class BaseRepository:
    """Small helper base for text-query repositories."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _json(value: Optional[Dict[str, Any]]) -> str:
        return json.dumps(value or {}, default=str)

    async def fetch_one(self, sql: str, params: Dict[str, Any]) -> Optional[RowMapping]:
        result = await self.session.execute(text(sql), params)
        return result.mappings().first()

    async def fetch_all(self, sql: str, params: Dict[str, Any]) -> list[RowMapping]:
        result = await self.session.execute(text(sql), params)
        return list(result.mappings().all())

    async def execute_returning(self, sql: str, params: Dict[str, Any]) -> Optional[RowMapping]:
        result = await self.session.execute(text(sql), params)
        return result.mappings().first()
