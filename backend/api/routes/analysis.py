"""
Analysis API endpoints
"""
import uuid
import json
import base64
from datetime import datetime
from io import BytesIO
from typing import Optional

import cv2
import numpy as np
from PIL import Image
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

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
    pip_settings: Optional[str] = Form(None)
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
        # Read and decode image
        contents = await image.read()
        pil_image = Image.open(BytesIO(contents)).convert("RGB")
        img_array = np.array(pil_image)
        
        # Parse PIP settings if provided
        settings = None
        if pip_settings:
            try:
                settings = json.loads(pip_settings)
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
        
        # Calculate basic metrics on the masked region
        basic = basic_metrics.calculate(img_array_masked)
        
        # Calculate color metrics
        color = color_metrics.calculate(img_array)
        
        # Calculate geometric metrics
        geometric = geometric_metrics.calculate(img_array)
        
        # Calculate contour metrics
        contour = contour_metrics.calculate(img_array)
        
        # Calculate nonlinear dynamics metrics
        nonlinear = nonlinear_metrics.calculate(img_array)
        
        # Calculate symmetry metrics
        symmetry = symmetry_metrics.calculate(img_array)
        
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
            }
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a specific analysis by ID."""
    # TODO: Implement database lookup
    raise HTTPException(status_code=404, detail="Analysis not found")


@router.get("/history")
async def get_analysis_history(
    limit: int = 50,
    offset: int = 0,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get analysis history with pagination."""
    # TODO: Implement database query
    return {
        "total": 0,
        "items": []
    }
