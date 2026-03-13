"""Biofield timeline API endpoints."""
from __future__ import annotations

from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db_session
from db.repositories import BiofieldTimelineRepository
from models.persistence import TimelineBatchCreate, TimelinePointCreate

router = APIRouter()


def ensure_persistence_enabled() -> None:
    if not settings.BIOFIELD_PERSISTENCE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Biofield persistence is disabled. Enable BIOFIELD_PERSISTENCE_ENABLED after applying the additive schema.",
        )


class TimelinePointRequest(BaseModel):
    sample_index: int = Field(ge=0)
    sample_time_ms: int = Field(ge=0)
    score_vector: Dict[str, Any] = Field(default_factory=dict)
    metric_vector: Dict[str, Any] = Field(default_factory=dict)
    source_kind: str = "live-estimate"
    score_recipe_version: str = "v1"
    metric_recipe_version: str = "v1"


class TimelineBatchRequest(BaseModel):
    session_id: UUID
    user_id: UUID
    points: List[TimelinePointRequest] = Field(default_factory=list)


@router.post("/batch")
async def create_timeline_batch(
    request: TimelineBatchRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Write a batch of timeline samples for one session."""
    ensure_persistence_enabled()
    repository = BiofieldTimelineRepository(db)
    rows = await repository.insert_batch(
        TimelineBatchCreate(
            session_id=request.session_id,
            user_id=request.user_id,
            points=[
                TimelinePointCreate(
                    session_id=request.session_id,
                    user_id=request.user_id,
                    sample_index=point.sample_index,
                    sample_time_ms=point.sample_time_ms,
                    score_vector=point.score_vector,
                    metric_vector=point.metric_vector,
                    source_kind=point.source_kind,
                    score_recipe_version=point.score_recipe_version,
                    metric_recipe_version=point.metric_recipe_version,
                )
                for point in request.points
            ],
        )
    )
    return {
        "count": len(rows),
        "items": [dict(row) for row in rows],
    }


@router.get("/{session_id}")
async def get_timeline(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    """List persisted timeline samples for one session."""
    ensure_persistence_enabled()
    repository = BiofieldTimelineRepository(db)
    rows = await repository.list_for_session(session_id)
    return {
        "total": len(rows),
        "items": [dict(row) for row in rows],
    }
