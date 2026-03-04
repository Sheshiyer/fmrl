"""
Geometric metrics for PIP analysis - contour and shape analysis
"""
import numpy as np
import cv2
from typing import Dict, Any, Optional, Tuple, List


class GeometricMetrics:
    """Calculate geometric/contour-based metrics."""
    
    @staticmethod
    def calculate_all(binary_image: np.ndarray) -> Dict[str, Any]:
        """
        Calculate all geometric metrics from a binary image.
        
        Args:
            binary_image: Binary image (255 = foreground, 0 = background)
        
        Returns:
            Dictionary of geometric metrics
        """
        contours, _ = cv2.findContours(
            binary_image, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return GeometricMetrics._empty_metrics()
        
        # Get largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Basic measurements
        area = cv2.contourArea(largest_contour)
        perimeter = cv2.arcLength(largest_contour, True)
        
        if area <= 0:
            return GeometricMetrics._empty_metrics()
        
        # Equivalent radius
        radius = np.sqrt(area / np.pi)
        
        # Fit ellipse if enough points
        ellipse_major, ellipse_minor, ellipse_angle = 0, 0, 0
        if len(largest_contour) >= 5:
            try:
                ellipse = cv2.fitEllipse(largest_contour)
                center, axes, ellipse_angle = ellipse
                ellipse_major = max(axes)
                ellipse_minor = min(axes)
            except cv2.error:
                pass
        
        # Bounding rectangle
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # Entropy Coefficient (EC)
        # EC = 1.0 for perfect circle, > 1.0 for irregular shapes
        ec = perimeter / (2 * np.sqrt(np.pi * area)) if area > 0 else 0
        
        # Form Coefficient (FC)
        # FC = 1.0 for perfect circle, > 1.0 for complex shapes
        fc = (perimeter ** 2) / (4 * np.pi * area) if area > 0 else 0
        
        # Convexity
        hull = cv2.convexHull(largest_contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        
        return {
            'area': float(area),
            'perimeter': float(perimeter),
            'innerContourLength': float(perimeter),
            'innerContourRadius': float(radius),
            'ellipseMajor': float(ellipse_major),
            'ellipseMinor': float(ellipse_minor),
            'ellipseAngle': float(ellipse_angle),
            'boundingBox': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
            'entropyCoefficient': float(ec),
            'formCoefficient': float(fc),
            'solidity': float(solidity),
            'aspectRatio': float(w / h) if h > 0 else 0
        }
    
    @staticmethod
    def _empty_metrics() -> Dict[str, Any]:
        """Return empty metric values."""
        return {
            'area': 0,
            'perimeter': 0,
            'innerContourLength': 0,
            'innerContourRadius': 0,
            'ellipseMajor': 0,
            'ellipseMinor': 0,
            'ellipseAngle': 0,
            'boundingBox': {'x': 0, 'y': 0, 'width': 0, 'height': 0},
            'entropyCoefficient': 0,
            'formCoefficient': 0,
            'solidity': 0,
            'aspectRatio': 0
        }
    
    @staticmethod
    def calculate_contour_complexity(binary_image: np.ndarray) -> float:
        """
        Calculate fractal dimension of the contour using box-counting.
        
        Args:
            binary_image: Binary image
        
        Returns:
            Fractal dimension estimate (1.0-2.0)
        """
        contours, _ = cv2.findContours(
            binary_image, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_NONE
        )
        
        if not contours:
            return 1.0
        
        # Create contour-only image
        contour_img = np.zeros(binary_image.shape, dtype=np.uint8)
        cv2.drawContours(contour_img, contours, -1, 255, 1)
        
        # Box-counting
        return GeometricMetrics._box_counting_dimension(contour_img)
    
    @staticmethod
    def _box_counting_dimension(Z: np.ndarray, threshold: float = 0.5) -> float:
        """
        Calculate fractal dimension using box-counting method.
        
        Args:
            Z: Binary image
            threshold: Threshold for box occupancy
        
        Returns:
            Fractal dimension
        """
        def boxcount(img, k):
            S = np.add.reduceat(
                np.add.reduceat(img, np.arange(0, img.shape[0], k), axis=0),
                np.arange(0, img.shape[1], k), axis=1
            )
            return len(np.where((S > 0) & (S < k*k))[0])
        
        Z = (Z > threshold * 255).astype(np.uint8)
        
        p = min(Z.shape)
        if p < 4:
            return 1.0
        
        n = int(np.floor(np.log2(p)))
        if n < 2:
            return 1.0
        
        sizes = 2 ** np.arange(n, 1, -1)
        counts = []
        
        for size in sizes:
            if size < Z.shape[0] and size < Z.shape[1]:
                counts.append(boxcount(Z, size))
        
        if len(counts) < 2:
            return 1.0
        
        sizes = sizes[:len(counts)]
        counts = np.array(counts)
        
        # Filter out zeros
        valid = counts > 0
        if np.sum(valid) < 2:
            return 1.0
        
        sizes = sizes[valid]
        counts = counts[valid]
        
        # Linear regression in log-log space
        coeffs = np.polyfit(np.log(sizes), np.log(counts), 1)
        
        return float(-coeffs[0])
    
    @staticmethod
    def get_centroid(binary_image: np.ndarray) -> Tuple[int, int]:
        """Get centroid of the largest contour."""
        contours, _ = cv2.findContours(
            binary_image, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return (binary_image.shape[1] // 2, binary_image.shape[0] // 2)
        
        largest = max(contours, key=cv2.contourArea)
        M = cv2.moments(largest)
        
        if M['m00'] > 0:
            cx = int(M['m10'] / M['m00'])
            cy = int(M['m01'] / M['m00'])
        else:
            x, y, w, h = cv2.boundingRect(largest)
            cx, cy = x + w // 2, y + h // 2
        
        return (cx, cy)
