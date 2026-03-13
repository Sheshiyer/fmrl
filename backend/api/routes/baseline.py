"""Baseline management API endpoints."""
from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db_session
from db.repositories import BiofieldBaselinesRepository
from models.persistence import BaselineCreate as BaselineCreatePayload

router = APIRouter()


class BaselineCreate(BaseModel):
    """Baseline creation request."""

    session_id: Optional[str] = None
    user_id: Optional[str] = None
    name: Optional[str] = None
    source_snapshot_id: Optional[str] = None
    source_reading_id: Optional[str] = None
    baseline_scores: Dict[str, Any] = Field(default_factory=dict)
    baseline_metrics: Dict[str, Any] = Field(default_factory=dict)
    provenance: Dict[str, Any] = Field(default_factory=dict)


class BaselineResponse(BaseModel):
    """Baseline response model."""

    id: Optional[str]
    name: Optional[str]
    is_active: bool
    created_at: str
    metrics: dict


def persistence_enabled() -> bool:
    return settings.BIOFIELD_PERSISTENCE_ENABLED


@router.post("/create", response_model=BaselineResponse)
async def create_baseline(
    request: BaselineCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new baseline from a session."""
    if not persistence_enabled():
        return {
            "id": "placeholder",
            "name": request.name,
            "is_active": False,
            "created_at": "2024-12-09T00:00:00Z",
            "metrics": {},
        }

    if not request.user_id:
        raise HTTPException(status_code=400, detail="user_id is required when persistence is enabled")

    repository = BiofieldBaselinesRepository(db)
    row = await repository.create_baseline(
        BaselineCreatePayload(
            user_id=UUID(request.user_id),
            name=request.name,
            source_session_id=UUID(request.session_id) if request.session_id else None,
            source_snapshot_id=UUID(request.source_snapshot_id) if request.source_snapshot_id else None,
            source_reading_id=UUID(request.source_reading_id) if request.source_reading_id else None,
            baseline_scores=request.baseline_scores,
            baseline_metrics=request.baseline_metrics,
            provenance=request.provenance,
        )
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create baseline")

    return {
        "id": str(row["id"]),
        "name": row["name"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"].isoformat(),
        "metrics": request.baseline_metrics,
    }


@router.get("/current")
async def get_current_baseline(
    user_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db_session),
):
    """Get the currently active baseline."""
    if not persistence_enabled() or not user_id:
        return {
            "id": None,
            "message": "No active baseline",
        }

    repository = BiofieldBaselinesRepository(db)
    row = await repository.get_active_baseline(UUID(user_id))
    if not row:
        return {
            "id": None,
            "message": "No active baseline",
        }

    return dict(row)


@router.put("/{baseline_id}/activate")
async def activate_baseline(
    baseline_id: str,
    user_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db_session),
):
    """Set a baseline as active."""
    if not persistence_enabled():
        return {"status": "activated", "baseline_id": baseline_id}

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required when persistence is enabled")

    repository = BiofieldBaselinesRepository(db)
    row = await repository.activate_baseline(UUID(baseline_id), UUID(user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Baseline not found")

    return {"status": "activated", "baseline_id": baseline_id, "active": True}


@router.delete("/{baseline_id}")
async def delete_baseline(
    baseline_id: str,
    user_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a baseline."""
    if not persistence_enabled():
        return {"status": "deleted"}

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required when persistence is enabled")

    repository = BiofieldBaselinesRepository(db)
    row = await repository.delete_baseline(UUID(baseline_id), UUID(user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Baseline not found")

    return {"status": "deleted", "baseline_id": baseline_id}
