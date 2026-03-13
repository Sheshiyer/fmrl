"""Profile and settings API endpoints."""
from __future__ import annotations

from typing import Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db_session
from db.repositories import UserProfilesRepository
from models.persistence import ProfileSettingsPatch, ProfileSettingsResponse, ProfileSettingsValue

router = APIRouter()


MANAGED_SETTING_NAMESPACES = ("appearance", "capture")


def ensure_persistence_enabled() -> None:
    if not settings.BIOFIELD_PERSISTENCE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Profile settings sync is disabled. Enable BIOFIELD_PERSISTENCE_ENABLED after applying the additive schema.",
        )


def _settings_payload(row: Dict[str, Any] | None) -> ProfileSettingsValue:
    preferences = (row or {}).get("preferences") or {}
    return ProfileSettingsValue(
        appearance=preferences.get("appearance") or {},
        capture=preferences.get("capture") or {},
    )


def _merge_namespace(existing: Any, patch: Dict[str, Any]) -> Dict[str, Any]:
    base = existing if isinstance(existing, dict) else {}
    return {
        **base,
        **patch,
    }


def _build_merged_preferences(existing_preferences: Dict[str, Any], patch: ProfileSettingsPatch) -> Dict[str, Any]:
    merged = dict(existing_preferences or {})

    if patch.appearance is not None:
        appearance_patch = patch.appearance.model_dump(exclude_none=True)
        if appearance_patch:
            merged["appearance"] = _merge_namespace(merged.get("appearance"), appearance_patch)

    if patch.capture is not None:
        capture_patch = patch.capture.model_dump(exclude_none=True)
        if capture_patch:
            merged["capture"] = _merge_namespace(merged.get("capture"), capture_patch)

    return merged


@router.get("/settings", response_model=ProfileSettingsResponse)
async def get_profile_settings(
    user_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db_session),
):
    """Fetch the synced settings subset stored in user_profiles.preferences."""
    ensure_persistence_enabled()
    repository = UserProfilesRepository(db)

    if not await repository.user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    row = await repository.get_profile(user_id)
    return ProfileSettingsResponse(
        user_id=user_id,
        profile_exists=row is not None,
        settings=_settings_payload(dict(row) if row else None),
        updated_at=row.get("updated_at") if row else None,
    )


@router.patch("/settings", response_model=ProfileSettingsResponse)
async def update_profile_settings(
    request: ProfileSettingsPatch,
    db: AsyncSession = Depends(get_db_session),
):
    """Patch synced settings inside user_profiles.preferences without overwriting unrelated keys."""
    ensure_persistence_enabled()
    repository = UserProfilesRepository(db)

    if request.appearance is None and request.capture is None:
        raise HTTPException(status_code=400, detail="At least one synced settings domain must be provided")

    if not await repository.user_exists(request.user_id):
        raise HTTPException(status_code=404, detail="User not found")

    current_row = await repository.get_profile(request.user_id)
    current_preferences = dict((current_row or {}).get("preferences") or {})
    merged_preferences = _build_merged_preferences(current_preferences, request)
    row = await repository.upsert_preferences(request.user_id, merged_preferences)
    if not row:
        raise HTTPException(status_code=500, detail="Failed to update profile settings")

    return ProfileSettingsResponse(
        user_id=request.user_id,
        profile_exists=True,
        settings=_settings_payload(dict(row)),
        updated_at=row.get("updated_at"),
    )
