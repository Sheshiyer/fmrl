"""
Analysis API endpoints
"""
import uuid
import json
import base64
import time
from datetime import datetime
from io import BytesIO
from typing import Optional
from uuid import UUID

import cv2
import numpy as np
from PIL import Image
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel

from config import settings
from core.persistence import build_capture_reading_create
from db import get_session_scope
from db.repositories import ReadingsRepository
from models.persistence import HistoryQuery

from core.metrics.basic import BasicMetrics
from core.metrics.color import ColorMetrics
from core.metrics.geometric import GeometricMetrics
from core.metrics.contour import ContourMetrics
from core.metrics.nonlinear import NonlinearMetrics
from core.metrics.symmetry import SymmetryMetrics
from core.scores.energy import EnergyScoreCalculator
from core.scores.symmetry import SymmetryScoreCalculator
from core.scores.coherence import CoherenceScoreCalculator
from core.scores.complexity import ComplexityScoreCalculator
from core.scores.regulation import RegulationScoreCalculator
from core.scores.color_balance import ColorBalanceScoreCalculator
from core.segmentation.body import BodySegmenter
from core.segmentation.face import FaceDetector
from core.segmentation.zones import ZoneCreator

router = APIRouter()

# Initialize services
basic_metrics = BasicMetrics()
color_metrics = ColorMetrics()
geometric_metrics = GeometricMetrics()
contour_metrics = ContourMetrics()
nonlinear_metrics = NonlinearMetrics()
symmetry_metrics = SymmetryMetrics()
energy_calc = EnergyScoreCalculator()
symmetry_calc = SymmetryScoreCalculator()
coherence_calc = CoherenceScoreCalculator()
complexity_calc = ComplexityScoreCalculator()
regulation_calc = RegulationScoreCalculator()
color_balance_calc = ColorBalanceScoreCalculator()
body_segmenter = BodySegmenter()
face_detector = FaceDetector()
zone_creator = ZoneCreator()


class AnalysisRequest(BaseModel):
    """Analysis request model."""
    mode: str = "fullBody"  # fullBody, face, body
    region: str = "full"  # full, face, body
    pip_settings: Optional[dict] = None


class AnalysisResponse(BaseModel):
    """Analysis response model."""
    id: str
    timestamp: str
    mode: str
    metrics: dict
    scores: dict
    images: dict
    persisted_reading_id: Optional[str] = None
    persistence_state: str = "disabled"
    persistence_error: Optional[str] = None


def image_to_base64(img: Image.Image, format: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    buffer = BytesIO()
    img.save(buffer, format=format)
    return f"data:image/{format.lower()};base64," + base64.b64encode(buffer.getvalue()).decode()


@router.post("/capture", response_model=AnalysisResponse)
async def capture_and_analyze(
    image: UploadFile = File(...),
    mode: str = Form("fullBody"),
    region: str = Form("full"),
    pip_settings: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    snapshot_id: Optional[str] = Form(None)
):
    """
    Capture and analyze a single frame.
    
    Args:
        image: The image file to analyze
        mode: Analysis mode (fullBody, face, segmented)
        region: Region to analyze (full, face, body)
        pip_settings: Optional PIP shader settings as JSON string
    
    Returns:
        AnalysisResponse with metrics, scores, and image URLs
    """
    try:
        analysis_started = time.perf_counter()

        # Read and decode image
        contents = await image.read()
        pil_image = Image.open(BytesIO(contents)).convert("RGB")
        img_array = np.array(pil_image)
        
        # Parse PIP settings if provided
        parsed_pip_settings = None
        if pip_settings:
            try:
                parsed_pip_settings = json.loads(pip_settings)
            except json.JSONDecodeError:
                pass
        
        # Apply region mask if not full image
        analysis_mask = None
        region_info = None
        
        if region == "face":
            # Detect face and create mask
            face_result = face_detector.detect(cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR))
            if face_result['face_detected']:
                analysis_mask = face_detector.create_face_mask(img_array.shape, face_result, padding=0.3)
                region_info = face_detector.get_face_region_normalized(face_result, padding=0.3)
        elif region == "body":
            # Segment body and create mask
            body_result = body_segmenter.segment(cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR))
            if body_result['body_detected']:
                analysis_mask = body_result['mask_binary']
                bbox = body_result['bounding_box']
                if bbox:
                    h, w = img_array.shape[:2]
                    region_info = {
                        'x': bbox['x'] / w,
                        'y': bbox['y'] / h,
                        'width': bbox['width'] / w,
                        'height': bbox['height'] / h
                    }
        
        # Apply mask to image for analysis if region specified
        if analysis_mask is not None:
            # Create masked image for analysis
            mask_3ch = np.stack([analysis_mask] * 3, axis=-1)
            img_array_masked = np.where(mask_3ch > 0, img_array, 0)
        else:
            img_array_masked = img_array
        
        # Calculate basic metrics on the selected analysis region
        basic = basic_metrics.calculate_all(img_array, analysis_mask)

        # Calculate color metrics
        color = color_metrics.calculate_all(img_array, analysis_mask)

        # Build a binary image for geometric shape analysis
        gray_for_geometry = cv2.cvtColor(img_array_masked, cv2.COLOR_RGB2GRAY)
        _, binary_for_geometry = cv2.threshold(gray_for_geometry, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Calculate geometric metrics
        geometric = geometric_metrics.calculate_all(binary_for_geometry)

        # Calculate contour metrics
        contour = contour_metrics.calculate(img_array, analysis_mask)

        # Calculate nonlinear dynamics metrics
        nonlinear = nonlinear_metrics.calculate(img_array, analysis_mask)

        # Calculate symmetry metrics
        symmetry = symmetry_metrics.calculate(img_array, analysis_mask)
        
        # Combine all metrics for score calculation
        all_metrics = {
            **basic,
            **color,
            **geometric,
            **contour,
            **nonlinear,
            **symmetry,
        }
        
        # Calculate composite scores
        scores = {
            "energy": energy_calc.calculate(all_metrics),
            "symmetry": symmetry_calc.calculate(all_metrics),
            "coherence": coherence_calc.calculate(all_metrics),
            "complexity": complexity_calc.calculate(all_metrics),
            "regulation": regulation_calc.calculate(all_metrics),
            "colorBalance": color_balance_calc.calculate(all_metrics),
        }
        
        # Generate analysis ID and timestamp
        analysis_id = str(uuid.uuid4())[:8]
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        # Create response
        response = {
            "id": analysis_id,
            "timestamp": timestamp,
            "mode": mode,
            "metrics": {
                "basic": basic,
                "color": color,
                "geometric": geometric,
                "contour": contour,
                "nonlinear": nonlinear,
                "symmetry": symmetry,
            },
            "scores": scores,
            "images": {
                "original": image_to_base64(pil_image),
                "processed": "",  # Could add heatmap visualization here
            },
            "persisted_reading_id": None,
            "persistence_state": "disabled" if not settings.BIOFIELD_PERSISTENCE_ENABLED else "skipped",
            "persistence_error": None,
        }

        if settings.BIOFIELD_PERSISTENCE_ENABLED and user_id:
            try:
                canonical_payload = build_capture_reading_create(
                    user_id=UUID(user_id),
                    mode=mode,
                    region=region,
                    pip_settings=parsed_pip_settings,
                    metrics_by_group=response["metrics"],
                    scores=scores,
                    calculation_time_ms=int((time.perf_counter() - analysis_started) * 1000),
                    session_id=session_id,
                    snapshot_id=snapshot_id,
                    capture_context={
                        "analysis_id": analysis_id,
                        "captured_at": timestamp,
                        "region_info": region_info,
                    },
                )
                async with get_session_scope() as db_session:
                    repository = ReadingsRepository(db_session)
                    persisted = await repository.create_reading(canonical_payload)
                if persisted:
                    response["persisted_reading_id"] = str(persisted["id"])
                    response["persistence_state"] = "persisted"
            except ValueError as exc:
                response["persistence_state"] = "error"
                response["persistence_error"] = f"Invalid persistence identifier: {exc}"
            except Exception as exc:
                response["persistence_state"] = "error"
                response["persistence_error"] = str(exc)

        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/history")
async def get_analysis_history(
    user_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    workflow_id: Optional[str] = Query(default=None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Get persisted Biofield analysis history with pagination."""
    if not settings.BIOFIELD_PERSISTENCE_ENABLED or not user_id:
        return {
            "total": 0,
            "items": [],
            "persistence_state": "disabled" if not settings.BIOFIELD_PERSISTENCE_ENABLED else "missing_user_scope",
        }

    async with get_session_scope() as db_session:
        repository = ReadingsRepository(db_session)
        rows = await repository.list_readings(
            HistoryQuery(
                user_id=user_id,
                limit=limit,
                offset=offset,
                engine_id="biofield-mirror",
                workflow_id=workflow_id,
            )
        )

    return {
        "total": len(rows),
        "items": [dict(row) for row in rows],
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "persistence_state": "persisted",
    }


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a specific persisted analysis by reading ID when persistence is enabled."""
    if not settings.BIOFIELD_PERSISTENCE_ENABLED:
        raise HTTPException(status_code=404, detail="Analysis not found")

    try:
        reading_id = UUID(analysis_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid analysis id: {exc}") from exc

    async with get_session_scope() as db_session:
        repository = ReadingsRepository(db_session)
        row = await repository.get_reading(reading_id)

    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return dict(row)
