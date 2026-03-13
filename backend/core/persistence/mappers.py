"""Canonical mappers for Biofield persistence payloads."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from config import settings
from models.persistence import (
    AnalysisProvenance,
    CanonicalReadingInput,
    CanonicalReadingResult,
    ReadingCreate,
    ScoreVector,
)


def _stable_json_hash(payload: Dict[str, Any]) -> str:
    normalized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def flatten_analysis_metrics(metric_groups: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Flatten grouped metric payloads into one canonical key-value map."""

    flattened: Dict[str, Any] = {}
    for group_name, group_values in metric_groups.items():
        if not isinstance(group_values, dict):
            flattened[group_name] = group_values
            continue

        for key, value in group_values.items():
            flattened[key] = value
            flattened[f"{group_name}.{key}"] = value

    return flattened


def build_analysis_provenance(
    workflow_id: str,
    mode: str,
    region: str,
    source_kind: str = "backend-detailed",
    runtime_route: str = "python",
) -> AnalysisProvenance:
    """Build the provenance envelope for current backend analysis flows."""

    return AnalysisProvenance(
        source_kind=source_kind,
        engine_id="biofield-mirror",
        workflow_id=workflow_id,
        analysis_mode=mode,
        analysis_region=region,
        score_recipe_version=settings.BIOFIELD_SCORE_RECIPE_VERSION,
        metric_recipe_version=settings.BIOFIELD_METRIC_RECIPE_VERSION,
        runtime_route=runtime_route,
        app_version=settings.VERSION,
    )


def build_capture_reading_create(
    *,
    user_id: UUID,
    mode: str,
    region: str,
    pip_settings: Optional[Dict[str, Any]],
    metrics_by_group: Dict[str, Dict[str, Any]],
    scores: Dict[str, Any],
    calculation_time_ms: Optional[int] = None,
    session_id: Optional[str] = None,
    snapshot_id: Optional[str] = None,
    capture_context: Optional[Dict[str, Any]] = None,
    artifact_refs: Optional[Dict[str, Any]] = None,
    workflow_id: str = "capture-detailed-analysis",
) -> ReadingCreate:
    """Map the current backend capture response into a canonical reading create payload."""

    provenance = build_analysis_provenance(
        workflow_id=workflow_id,
        mode=mode,
        region=region,
        source_kind="backend-detailed",
        runtime_route="python",
    )

    input_payload = CanonicalReadingInput(
        session_id=session_id,
        snapshot_id=snapshot_id,
        analysis_mode=mode,
        analysis_region=region,
        pip_settings=pip_settings or {},
        capture_context=capture_context or {},
        provenance=provenance,
    )

    result_payload = CanonicalReadingResult(
        scores=ScoreVector(**scores),
        metrics=flatten_analysis_metrics(metrics_by_group),
        metric_groups=metrics_by_group,
        artifact_refs=artifact_refs or {},
        provenance=provenance,
    )

    hash_payload = {
        "analysis_mode": mode,
        "analysis_region": region,
        "pip_settings": pip_settings or {},
        "capture_context": capture_context or {},
        "metric_groups": metrics_by_group,
        "scores": scores,
    }

    return ReadingCreate(
        user_id=user_id,
        engine_id="biofield-mirror",
        workflow_id=workflow_id,
        input_hash=_stable_json_hash(hash_payload),
        input_data=input_payload,
        result_data=result_payload,
        calculation_time_ms=calculation_time_ms,
    )


def build_session_summary_result(
    *,
    mode: str,
    region: str,
    scores: Dict[str, Any],
    metrics: Dict[str, Any],
    session_id: str,
    duration_seconds: int,
    workflow_id: str = "live-session-summary",
) -> CanonicalReadingResult:
    """Build a canonical result envelope for future session-summary writes."""

    provenance = build_analysis_provenance(
        workflow_id=workflow_id,
        mode=mode,
        region=region,
        source_kind="live-estimate",
        runtime_route="frontend",
    )

    return CanonicalReadingResult(
        scores=ScoreVector(**scores),
        metrics=metrics,
        metric_groups={"live": metrics},
        comparisons={
            "session_id": session_id,
            "duration_seconds": duration_seconds,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        provenance=provenance,
    )
