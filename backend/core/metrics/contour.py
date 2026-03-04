"""
Contour Analysis Metrics
Implements: area, perimeter, inner/outer contour, radius, ellipse, EC, FC
"""
import numpy as np
import cv2
from typing import Dict, List, Tuple, Optional
import math


class ContourMetrics:
    """Calculates contour-based metrics from binary masks or grayscale images."""
    
    def __init__(self, threshold: int = 128):
        self.threshold = threshold
    
    def calculate(self, image: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict:
        """
        Calculate all contour metrics.
        
        Args:
            image: Grayscale or RGB image
            mask: Optional binary mask for ROI
        
        Returns:
            Dictionary with contour metrics
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image.copy()
        
        # Apply mask if provided
        if mask is not None:
            gray = cv2.bitwise_and(gray, gray, mask=mask.astype(np.uint8))
        
        # Threshold to binary
        _, binary = cv2.threshold(gray, self.threshold, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, hierarchy = cv2.findContours(
            binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return self._empty_metrics()
        
        # Get the largest contour
        main_contour = max(contours, key=cv2.contourArea)
        
        # Calculate basic metrics
        area = cv2.contourArea(main_contour)
        perimeter = cv2.arcLength(main_contour, True)
        
        # Calculate inner and outer contours
        inner_contours, outer_contour = self._classify_contours(contours, hierarchy)
        inner_perimeter = sum(cv2.arcLength(c, True) for c in inner_contours)
        outer_perimeter = cv2.arcLength(outer_contour, True) if outer_contour is not None else perimeter
        
        # Fit ellipse if contour is large enough
        ellipse_data = self._fit_ellipse(main_contour)
        
        # Calculate equivalent radius
        equiv_radius = math.sqrt(area / math.pi) if area > 0 else 0
        
        # Calculate entropy coefficient (EC)
        entropy_coefficient = self._calculate_ec(perimeter, area)
        
        # Calculate form coefficient (FC)
        form_coefficient = self._calculate_fc(perimeter, area)
        
        # Calculate contour complexity (fractal-like)
        contour_complexity = self._calculate_contour_complexity(main_contour, area, perimeter)
        
        # Convexity and solidity
        hull = cv2.convexHull(main_contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        convexity = cv2.arcLength(hull, True) / perimeter if perimeter > 0 else 0
        
        return {
            "contour_area": float(area),
            "contour_perimeter": float(perimeter),
            "inner_contour_length": float(inner_perimeter),
            "outer_contour_length": float(outer_perimeter),
            "equivalent_radius": float(equiv_radius),
            "entropy_coefficient": float(entropy_coefficient),
            "form_coefficient": float(form_coefficient),
            "contour_complexity": float(contour_complexity),
            "solidity": float(solidity),
            "convexity": float(convexity),
            "ellipse_major_axis": float(ellipse_data.get("major_axis", 0)),
            "ellipse_minor_axis": float(ellipse_data.get("minor_axis", 0)),
            "ellipse_eccentricity": float(ellipse_data.get("eccentricity", 0)),
            "ellipse_angle": float(ellipse_data.get("angle", 0)),
            "num_contours": len(contours),
            "num_inner_contours": len(inner_contours),
        }
    
    def _classify_contours(
        self, contours: List, hierarchy: np.ndarray
    ) -> Tuple[List, Optional[np.ndarray]]:
        """Classify contours into inner and outer based on hierarchy."""
        if hierarchy is None or len(contours) == 0:
            return [], None
        
        hierarchy = hierarchy[0]
        inner = []
        outer = None
        max_area = 0
        
        for i, contour in enumerate(contours):
            # Parent index is at hierarchy[i][3]
            parent = hierarchy[i][3]
            area = cv2.contourArea(contour)
            
            if parent == -1:  # No parent = outer contour
                if area > max_area:
                    max_area = area
                    outer = contour
            else:
                inner.append(contour)
        
        return inner, outer
    
    def _fit_ellipse(self, contour: np.ndarray) -> Dict:
        """Fit ellipse to contour and extract parameters."""
        if len(contour) < 5:
            return {"major_axis": 0, "minor_axis": 0, "eccentricity": 0, "angle": 0}
        
        try:
            ellipse = cv2.fitEllipse(contour)
            center, axes, angle = ellipse
            major_axis = max(axes)
            minor_axis = min(axes)
            
            # Calculate eccentricity
            if major_axis > 0:
                eccentricity = math.sqrt(1 - (minor_axis / major_axis) ** 2)
            else:
                eccentricity = 0
            
            return {
                "major_axis": major_axis,
                "minor_axis": minor_axis,
                "eccentricity": eccentricity,
                "angle": angle,
            }
        except cv2.error:
            return {"major_axis": 0, "minor_axis": 0, "eccentricity": 0, "angle": 0}
    
    def _calculate_ec(self, perimeter: float, area: float) -> float:
        """
        Calculate Entropy Coefficient.
        EC = perimeter / (2 * sqrt(π * area))
        EC = 1 for perfect circle, > 1 for irregular shapes.
        """
        if area <= 0:
            return 0
        return perimeter / (2 * math.sqrt(math.pi * area))
    
    def _calculate_fc(self, perimeter: float, area: float) -> float:
        """
        Calculate Form Coefficient.
        FC = perimeter² / (4π * area)
        FC = 1 for perfect circle, > 1 for complex shapes.
        """
        if area <= 0:
            return 0
        return (perimeter ** 2) / (4 * math.pi * area)
    
    def _calculate_contour_complexity(
        self, contour: np.ndarray, area: float, perimeter: float
    ) -> float:
        """Calculate contour complexity using Douglas-Peucker approximation."""
        if perimeter <= 0:
            return 0
        
        # Approximate contour with varying epsilon
        epsilon_ratios = [0.001, 0.01, 0.05, 0.1]
        complexity_sum = 0
        
        for ratio in epsilon_ratios:
            epsilon = ratio * perimeter
            approx = cv2.approxPolyDP(contour, epsilon, True)
            complexity_sum += len(approx)
        
        # Normalize by number of tests
        return complexity_sum / len(epsilon_ratios) / 10  # Scale to reasonable range
    
    def _empty_metrics(self) -> Dict:
        """Return empty metrics when no contours found."""
        return {
            "contour_area": 0.0,
            "contour_perimeter": 0.0,
            "inner_contour_length": 0.0,
            "outer_contour_length": 0.0,
            "equivalent_radius": 0.0,
            "entropy_coefficient": 0.0,
            "form_coefficient": 0.0,
            "contour_complexity": 0.0,
            "solidity": 0.0,
            "convexity": 0.0,
            "ellipse_major_axis": 0.0,
            "ellipse_minor_axis": 0.0,
            "ellipse_eccentricity": 0.0,
            "ellipse_angle": 0.0,
            "num_contours": 0,
            "num_inner_contours": 0,
        }
