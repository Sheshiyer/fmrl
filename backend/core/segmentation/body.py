"""
Body Segmentation using MediaPipe Selfie Segmentation

IMPORTANT: MediaPipe is the MANDATORY choice for all segmentation.
Do NOT use SAM, SAM 2, SAM 3, or any GPU-heavy alternatives.
"""
import cv2
import numpy as np
from typing import Dict, Any, Optional

try:
    import mediapipe as mp
except ImportError:
    mp = None


class BodySegmenter:
    """
    MediaPipe-based body segmentation for PIP analysis.
    """
    
    def __init__(self, model_selection: int = 1):
        """
        Initialize segmenter.
        
        Args:
            model_selection: 0 for general, 1 for landscape (recommended)
        """
        self.available = False
        self.segmenter = None
        self.mp_selfie = None

        if mp is None or not hasattr(mp, "solutions"):
            return

        selfie = getattr(mp.solutions, "selfie_segmentation", None)
        if selfie is None or not hasattr(selfie, "SelfieSegmentation"):
            return

        self.mp_selfie = selfie
        self.segmenter = self.mp_selfie.SelfieSegmentation(model_selection=model_selection)
        self.available = True
    
    def segment(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Segment body from background.
        
        Args:
            image: BGR image (OpenCV format)
            
        Returns:
            dict with mask, confidence, bounding_box, centroid
        """
        if not self.available or self.segmenter is None:
            h, w = image.shape[:2]
            return {
                'mask_binary': np.zeros((h, w), dtype=np.uint8),
                'mask_confidence': np.zeros((h, w), dtype=np.float32),
                'bounding_box': None,
                'centroid': {'x': w // 2, 'y': h // 2},
                'body_area': 0,
                'body_detected': False,
            }

        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Process
        results = self.segmenter.process(image_rgb)
        
        # Get mask (0-1 float, threshold for binary)
        mask_float = results.segmentation_mask
        mask_binary = (mask_float > 0.5).astype(np.uint8) * 255
        
        # Calculate bounding box and centroid
        bounding_box = None
        cx, cy = image.shape[1] // 2, image.shape[0] // 2
        body_area = 0
        
        contours, _ = cv2.findContours(
            mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if contours:
            largest = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest)
            bounding_box = {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)}
            body_area = int(cv2.contourArea(largest))
            
            # Calculate centroid
            M = cv2.moments(largest)
            if M['m00'] > 0:
                cx = int(M['m10'] / M['m00'])
                cy = int(M['m01'] / M['m00'])
            else:
                cx, cy = x + w // 2, y + h // 2
        
        return {
            'mask_binary': mask_binary,
            'mask_confidence': mask_float,
            'bounding_box': bounding_box,
            'centroid': {'x': cx, 'y': cy},
            'body_area': body_area,
            'body_detected': len(contours) > 0
        }
    
    def get_midline_x(self, segmentation_result: Dict[str, Any]) -> int:
        """
        Get the X coordinate of the body midline.
        
        Args:
            segmentation_result: Result from segment() method
        
        Returns:
            X coordinate of midline
        """
        return segmentation_result['centroid']['x']
    
    def close(self):
        """Release resources."""
        if self.segmenter is not None:
            self.segmenter.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
