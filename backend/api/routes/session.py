"""Biofield session API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db_session
from db.repositories import BiofieldSessionsRepository
from models.persistence import BiofieldSessionCreate, BiofieldSessionUpdate, HistoryQuery

router = APIRouter()


def ensure_persistence_enabled() -> None:
    if not settings.BIOFIELD_PERSISTENCE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Biofield persistence is disabled. Enable BIOFIELD_PERSISTENCE_ENABLED after applying the additive schema.",
        )


class SessionCreateRequest(BaseModel):
    user_id: UUID
    analysis_mode: str = "fullBody"
    analysis_region: str = "full"
    source_kind: str = "live-estimate"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SessionUpdateRequest(BaseModel):
    status: Optional[str] = None
    latest_snapshot_id: Optional[UUID] = None
    summary_reading_id: Optional[UUID] = None
    paused_at: Optional[datetime] = None
    paused_at_set: bool = False
    ended_at: Optional[datetime] = None
    ended_at_set: bool = False
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    metadata: Optional[Dict[str, Any]] = None


class SessionResponse(BaseModel):
    id: str
    user_id: str
    status: str
    started_at: Optional[str] = None
    created_at: Optional[str] = None


@router.post("", response_model=SessionResponse)
async def create_session(
    request: SessionCreateRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a canonical Biofield session record."""
    ensure_persistence_enabled()
    repository = BiofieldSessionsRepository(db)
    row = await repository.create_session(
        BiofieldSessionCreate(
            user_id=request.user_id,
            analysis_mode=request.analysis_mode,
            analysis_region=request.analysis_region,
            source_kind=request.source_kind,
            metadata=request.metadata,
        )
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create session")

    return SessionResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        status=row["status"],
        started_at=row["started_at"].isoformat() if row.get("started_at") else None,
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
    )


@router.patch("/{session_id}")
async def update_session(
    session_id: UUID,
    request: SessionUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Patch Biofield session lifecycle state."""
    ensure_persistence_enabled()
    repository = BiofieldSessionsRepository(db)
    row = await repository.update_session(
        session_id,
        BiofieldSessionUpdate(
            status=request.status,
            latest_snapshot_id=request.latest_snapshot_id,
            summary_reading_id=request.summary_reading_id,
            paused_at=request.paused_at,
            paused_at_set=request.paused_at_set,
            ended_at=request.ended_at,
            ended_at_set=request.ended_at_set,
            duration_seconds=request.duration_seconds,
            metadata=request.metadata,
        ),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return dict(row)


@router.post("/{session_id}/pause")
async def pause_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    """Pause a session and stamp its pause time."""
    ensure_persistence_enabled()
    repository = BiofieldSessionsRepository(db)
    row = await repository.update_session(
        session_id,
        BiofieldSessionUpdate(
            status="paused",
            paused_at=datetime.now(timezone.utc),
            paused_at_set=True,
        ),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return dict(row)


@router.post("/{session_id}/resume")
async def resume_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    """Resume a paused session and clear its pause timestamp."""
    ensure_persistence_enabled()
    repository = BiofieldSessionsRepository(db)
    row = await repository.update_session(
        session_id,
        BiofieldSessionUpdate(
            status="active",
            paused_at=None,
            paused_at_set=True,
        ),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return dict(row)


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: UUID,
    duration_seconds: Optional[int] = Query(default=None, ge=0),
    summary_reading_id: Optional[UUID] = Query(default=None),
    db: AsyncSession = Depends(get_db_session),
):
    """Complete a session with optional final duration and summary reading linkage."""
    ensure_persistence_enabled()
    repository = BiofieldSessionsRepository(db)
    row = await repository.update_session(
        session_id,
        BiofieldSessionUpdate(
            status="completed",
            ended_at=datetime.now(timezone.utc),
            ended_at_set=True,
            duration_seconds=duration_seconds,
            summary_reading_id=summary_reading_id,
        ),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return dict(row)


@router.get("/{session_id}")
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    """Fetch a canonical Biofield session by ID."""
    ensure_persistence_enabled()
    repository = BiofieldSessionsRepository(db)
    row = await repository.get_session(session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return dict(row)


@router.get("")
async def list_sessions(
    user_id: UUID = Query(...),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """List FMRL sessions for one Selemene user."""
    ensure_persistence_enabled()
    repository = BiofieldSessionsRepository(db)
    rows = await repository.list_sessions(
        HistoryQuery(
            user_id=user_id,
            limit=limit,
            offset=offset,
        )
    )
    return {
        "total": len(rows),
        "items": [dict(row) for row in rows],
    }
