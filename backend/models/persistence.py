"""Canonical persistence models for Selene × Biofield integration."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


SourceKind = Literal["live-estimate", "backend-detailed", "python-engine", "rust-engine"]
AnalysisMode = Literal["fullBody", "face", "segmented"]
AnalysisRegion = Literal["full", "face", "body"]
SessionStatus = Literal["active", "paused", "completed", "aborted"]
ArtifactType = Literal[
    "capture-original",
    "capture-processed",
    "report-pdf",
    "report-json",
    "report-html",
]


class ScoreVector(BaseModel):
    """Canonical composite score vector."""

    energy: float = Field(ge=0, le=100)
    symmetry: float = Field(ge=0, le=100)
    coherence: float = Field(ge=0, le=100)
    complexity: float = Field(ge=0, le=100)
    regulation: float = Field(ge=0, le=100)
    colorBalance: float = Field(ge=0, le=100)


class AnalysisProvenance(BaseModel):
    """Metadata required to explain how a persisted record was produced."""

    source_kind: SourceKind
    engine_id: str = Field(min_length=1)
    workflow_id: str = Field(min_length=1)
    analysis_mode: AnalysisMode = "fullBody"
    analysis_region: AnalysisRegion = "full"
    score_recipe_version: str = "v1"
    metric_recipe_version: str = "v1"
    runtime_route: str = "python"
    app_version: Optional[str] = None


class CanonicalReadingInput(BaseModel):
    """Normalized reading input payload for `public.readings.input_data`."""

    session_id: Optional[str] = None
    snapshot_id: Optional[str] = None
    analysis_mode: AnalysisMode = "fullBody"
    analysis_region: AnalysisRegion = "full"
    pip_settings: Dict[str, Any] = Field(default_factory=dict)
    capture_context: Dict[str, Any] = Field(default_factory=dict)
    provenance: AnalysisProvenance


class CanonicalReadingResult(BaseModel):
    """Normalized reading result payload for `public.readings.result_data`."""

    scores: ScoreVector
    metrics: Dict[str, Any] = Field(default_factory=dict)
    metric_groups: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    artifact_refs: Dict[str, Any] = Field(default_factory=dict)
    comparisons: Dict[str, Any] = Field(default_factory=dict)
    provenance: AnalysisProvenance


class ReadingCreate(BaseModel):
    """Create payload for canonical Biofield-backed Selene readings."""

    user_id: UUID
    engine_id: str = "biofield-mirror"
    workflow_id: str
    input_hash: str
    input_data: CanonicalReadingInput
    result_data: CanonicalReadingResult
    witness_prompt: Optional[str] = None
    consciousness_level: Optional[int] = None
    calculation_time_ms: Optional[int] = Field(default=None, ge=0)


class BiofieldSessionCreate(BaseModel):
    """Create payload for a persisted Biofield session."""

    user_id: UUID
    status: SessionStatus = "active"
    analysis_mode: AnalysisMode = "fullBody"
    analysis_region: AnalysisRegion = "full"
    source_kind: SourceKind = "live-estimate"
    summary_reading_id: Optional[UUID] = None
    latest_snapshot_id: Optional[UUID] = None
    started_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    score_recipe_version: str = "v1"
    metric_recipe_version: str = "v1"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BiofieldSessionUpdate(BaseModel):
    """Patch payload for session lifecycle updates."""

    status: Optional[SessionStatus] = None
    latest_snapshot_id: Optional[UUID] = None
    summary_reading_id: Optional[UUID] = None
    paused_at: Optional[datetime] = None
    paused_at_set: bool = False
    ended_at: Optional[datetime] = None
    ended_at_set: bool = False
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    metadata: Optional[Dict[str, Any]] = None


class BiofieldArtifactCreate(BaseModel):
    """Create payload for storage-backed Biofield artifacts."""

    user_id: UUID
    artifact_type: ArtifactType
    storage_bucket: str
    storage_path: str
    content_type: Optional[str] = None
    byte_size: Optional[int] = Field(default=None, ge=0)
    linked_session_id: Optional[UUID] = None
    linked_snapshot_id: Optional[UUID] = None
    linked_reading_id: Optional[UUID] = None
    checksum_sha256: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BiofieldSnapshotCreate(BaseModel):
    """Create payload for a persisted user-visible capture event."""

    user_id: UUID
    session_id: Optional[UUID] = None
    reading_id: Optional[UUID] = None
    label: Optional[str] = None
    capture_mode: Literal["manual", "auto", "baseline-source"] = "manual"
    analysis_region: AnalysisRegion = "full"
    source_kind: SourceKind = "backend-detailed"
    original_artifact_id: Optional[UUID] = None
    processed_artifact_id: Optional[UUID] = None
    captured_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TimelinePointCreate(BaseModel):
    """Create payload for one persisted session timeline sample."""

    session_id: UUID
    user_id: UUID
    sample_index: int = Field(ge=0)
    sample_time_ms: int = Field(ge=0)
    score_vector: Dict[str, Any] = Field(default_factory=dict)
    metric_vector: Dict[str, Any] = Field(default_factory=dict)
    source_kind: SourceKind = "live-estimate"
    score_recipe_version: str = "v1"
    metric_recipe_version: str = "v1"


class BaselineCreate(BaseModel):
    """Create payload for a persisted Biofield baseline."""

    user_id: UUID
    name: Optional[str] = None
    is_active: bool = False
    source_session_id: Optional[UUID] = None
    source_snapshot_id: Optional[UUID] = None
    source_reading_id: Optional[UUID] = None
    baseline_scores: Dict[str, Any] = Field(default_factory=dict)
    baseline_metrics: Dict[str, Any] = Field(default_factory=dict)
    provenance: Dict[str, Any] = Field(default_factory=dict)


class HistoryQuery(BaseModel):
    """Shared query envelope for paginated reading/session history APIs."""

    user_id: UUID
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    engine_id: Optional[str] = None
    workflow_id: Optional[str] = None
    session_id: Optional[UUID] = None


class TimelineBatchCreate(BaseModel):
    """Bulk write envelope for timeline samples."""

    session_id: UUID
    user_id: UUID
    points: List[TimelinePointCreate] = Field(default_factory=list)


ThemeMode = Literal["sacred-dark", "dim", "high-contrast"]
WorkspaceDensity = Literal["compact", "balanced", "spacious"]
MotionLevel = Literal["full", "reduced", "minimal"]
AccentProfile = Literal["gold", "violet", "neutral"]
ExportBundle = Literal["json", "html", "pdf", "bundle"]


class AppearanceSettingsValue(BaseModel):
    themeMode: ThemeMode = "sacred-dark"
    workspaceDensity: WorkspaceDensity = "balanced"
    motionLevel: MotionLevel = "reduced"
    accentProfile: AccentProfile = "gold"
    showOverlayLegend: bool = True
    showStageSignals: bool = True


class AppearanceSettingsPatch(BaseModel):
    themeMode: Optional[ThemeMode] = None
    workspaceDensity: Optional[WorkspaceDensity] = None
    motionLevel: Optional[MotionLevel] = None
    accentProfile: Optional[AccentProfile] = None
    showOverlayLegend: Optional[bool] = None
    showStageSignals: Optional[bool] = None


class CaptureSettingsValue(BaseModel):
    defaultAnalysisRegion: AnalysisRegion = "full"
    autoCreateSnapshot: bool = True
    suggestBaselineAfterCapture: bool = True
    exportBundle: ExportBundle = "bundle"
    snapshotLabelTemplate: str = "Captured Analysis — {date} {time}"


class CaptureSettingsPatch(BaseModel):
    defaultAnalysisRegion: Optional[AnalysisRegion] = None
    autoCreateSnapshot: Optional[bool] = None
    suggestBaselineAfterCapture: Optional[bool] = None
    exportBundle: Optional[ExportBundle] = None
    snapshotLabelTemplate: Optional[str] = None


class ProfileSettingsPatch(BaseModel):
    user_id: UUID
    appearance: Optional[AppearanceSettingsPatch] = None
    capture: Optional[CaptureSettingsPatch] = None


class ProfileSettingsValue(BaseModel):
    appearance: Dict[str, Any] = Field(default_factory=dict)
    capture: Dict[str, Any] = Field(default_factory=dict)


class ProfileSettingsResponse(BaseModel):
    user_id: UUID
    profile_exists: bool
    settings: ProfileSettingsValue
    updated_at: Optional[datetime] = None
