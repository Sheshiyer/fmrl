"""Repository for Selene `public.readings` access."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from models.persistence import HistoryQuery, ReadingCreate
from db.repositories.base import BaseRepository


class ReadingsRepository(BaseRepository):
    """Read/write repository for canonical Biofield-backed Selene readings."""

    async def create_reading(self, payload: ReadingCreate):
        sql = """
        insert into public.readings (
            user_id,
            engine_id,
            workflow_id,
            input_hash,
            input_data,
            result_data,
            witness_prompt,
            consciousness_level,
            calculation_time_ms
        ) values (
            :user_id,
            :engine_id,
            :workflow_id,
            :input_hash,
            cast(:input_data as jsonb),
            cast(:result_data as jsonb),
            :witness_prompt,
            :consciousness_level,
            :calculation_time_ms
        )
        returning id, user_id, engine_id, workflow_id, created_at
        """
        return await self.execute_returning(
            sql,
            {
                "user_id": str(payload.user_id),
                "engine_id": payload.engine_id,
                "workflow_id": payload.workflow_id,
                "input_hash": payload.input_hash,
                "input_data": self._json(payload.input_data.model_dump()),
                "result_data": self._json(payload.result_data.model_dump()),
                "witness_prompt": payload.witness_prompt,
                "consciousness_level": payload.consciousness_level,
                "calculation_time_ms": payload.calculation_time_ms,
            },
        )

    async def get_reading(self, reading_id: UUID):
        sql = """
        select
            id,
            user_id,
            engine_id,
            workflow_id,
            input_hash,
            input_data,
            result_data,
            witness_prompt,
            consciousness_level,
            calculation_time_ms,
            created_at
        from public.readings
        where id = :reading_id
        limit 1
        """
        return await self.fetch_one(sql, {"reading_id": str(reading_id)})

    async def list_readings(self, query: HistoryQuery):
        sql = """
        select
            id,
            user_id,
            engine_id,
            workflow_id,
            input_hash,
            input_data,
            result_data,
            consciousness_level,
            calculation_time_ms,
            created_at,
            session_id,
            session_status,
            snapshot_id,
            snapshot_label,
            snapshot_captured_at
        from public.biofield_reading_history
        where user_id = :user_id
          and (cast(:engine_id as text) is null or engine_id = cast(:engine_id as text))
          and (cast(:workflow_id as text) is null or workflow_id = cast(:workflow_id as text))
        order by created_at desc
        limit :limit offset :offset
        """
        return await self.fetch_all(
            sql,
            {
                "user_id": str(query.user_id),
                "engine_id": query.engine_id,
                "workflow_id": query.workflow_id,
                "limit": query.limit,
                "offset": query.offset,
            },
        )

    async def list_readings_for_session(self, user_id: UUID, session_id: str, limit: int = 50):
        sql = """
        select
            id,
            user_id,
            engine_id,
            workflow_id,
            input_data,
            result_data,
            created_at
        from public.readings
        where user_id = :user_id
          and coalesce(input_data ->> 'session_id', '') = :session_id
        order by created_at desc
        limit :limit
        """
        return await self.fetch_all(
            sql,
            {
                "user_id": str(user_id),
                "session_id": session_id,
                "limit": limit,
            },
        )
