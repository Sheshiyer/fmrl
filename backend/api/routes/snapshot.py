"""Biofield snapshot API endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db_session
from db.repositories import BiofieldSessionsRepository, BiofieldSnapshotsRepository
from models.persistence import BiofieldSessionUpdate, BiofieldSnapshotCreate, HistoryQuery

router = APIRouter()


def ensure_persistence_enabled() -> None:
    if not settings.BIOFIELD_PERSISTENCE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Biofield persistence is disabled. Enable BIOFIELD_PERSISTENCE_ENABLED after applying the additive schema.",
        )


class SnapshotCreateRequest(BaseModel):
    user_id: UUID
    session_id: Optional[UUID] = None
    reading_id: Optional[UUID] = None
    label: Optional[str] = None
    capture_mode: str = "manual"
    analysis_region: str = "full"
    source_kind: str = "backend-detailed"
    original_artifact_id: Optional[UUID] = None
    processed_artifact_id: Optional[UUID] = None
    captured_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


@router.post("")
async def create_snapshot(
    request: SnapshotCreateRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a canonical Biofield snapshot record."""
    ensure_persistence_enabled()
    repository = BiofieldSnapshotsRepository(db)
    row = await repository.create_snapshot(
        BiofieldSnapshotCreate(
            user_id=request.user_id,
            session_id=request.session_id,
            reading_id=request.reading_id,
            label=request.label,
            capture_mode=request.capture_mode,
            analysis_region=request.analysis_region,
            source_kind=request.source_kind,
            original_artifact_id=request.original_artifact_id,
            processed_artifact_id=request.processed_artifact_id,
            captured_at=request.captured_at,
            metadata=request.metadata,
        )
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create snapshot")

    if request.session_id and row.get("id"):
        await BiofieldSessionsRepository(db).update_session(
            request.session_id,
            BiofieldSessionUpdate(latest_snapshot_id=UUID(str(row["id"]))),
        )

    return dict(row)


@router.get("/{snapshot_id}")
async def get_snapshot(
    snapshot_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    """Fetch one persisted snapshot record."""
    ensure_persistence_enabled()
    repository = BiofieldSnapshotsRepository(db)
    row = await repository.get_snapshot(snapshot_id)
    if not row:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return dict(row)


@router.get("")
async def list_snapshots(
    user_id: UUID = Query(...),
    session_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """List snapshots for one Biofield user, optionally filtered by session."""
    ensure_persistence_enabled()
    repository = BiofieldSnapshotsRepository(db)
    rows = await repository.list_snapshots(
        HistoryQuery(
            user_id=user_id,
            session_id=session_id,
            limit=limit,
            offset=offset,
        )
    )
    return {
        "total": len(rows),
        "items": [dict(row) for row in rows],
    }
