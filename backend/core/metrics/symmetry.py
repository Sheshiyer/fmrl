"""
Symmetry Analysis Metrics
Implements: SSIM-based symmetry, histogram correlation, zone symmetry
"""
import numpy as np
import cv2
from typing import Dict, Optional, Tuple
from skimage.metrics import structural_similarity as ssim


class SymmetryMetrics:
    """Calculates symmetry metrics using multiple methods."""
    
    def __init__(self, midline: Optional[int] = None):
        self.midline = midline
    
    def calculate(self, image: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict:
        """
        Calculate all symmetry metrics.
        
        Args:
            image: RGB or grayscale image
            mask: Optional binary mask for ROI
        
        Returns:
            Dictionary with symmetry metrics
        """
        # Ensure correct format
        if len(image.shape) == 2:
            gray = image
            color = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        else:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            color = image
        
        # Determine midline
        midline = self.midline if self.midline else image.shape[1] // 2
        
        # Apply mask if provided
        if mask is not None:
            gray = cv2.bitwise_and(gray, gray, mask=mask.astype(np.uint8))
            mask_3ch = np.stack([mask] * 3, axis=-1).astype(np.uint8)
            color = cv2.bitwise_and(color, color, mask=mask_3ch[:, :, 0])
        
        # Split image at midline
        left_gray, right_gray = self._split_at_midline(gray, midline)
        left_color, right_color = self._split_at_midline(color, midline)
        
        # Calculate SSIM-based symmetry
        ssim_symmetry = self._ssim_symmetry(left_gray, right_gray)
        
        # Calculate correlation-based symmetry
        correlation_symmetry = self._correlation_symmetry(left_gray, right_gray)
        
        # Calculate histogram-based symmetry
        hist_symmetry = self._histogram_symmetry(left_gray, right_gray)
        
        # Calculate color histogram symmetry
        color_hist_symmetry = self._color_histogram_symmetry(left_color, right_color)
        
        # Calculate pixel-wise symmetry
        pixel_symmetry = self._pixel_symmetry(left_gray, right_gray)
        
        # Calculate contour balance
        contour_balance = self._contour_balance(left_gray, right_gray)
        
        # Overall body symmetry (weighted combination)
        body_symmetry = (
            0.35 * ssim_symmetry +
            0.25 * correlation_symmetry +
            0.20 * hist_symmetry +
            0.20 * pixel_symmetry
        )
        
        # Color symmetry
        color_symmetry = color_hist_symmetry
        
        return {
            "body_symmetry": float(body_symmetry),
            "ssim_symmetry": float(ssim_symmetry),
            "correlation_symmetry": float(correlation_symmetry),
            "histogram_symmetry": float(hist_symmetry),
            "color_symmetry": float(color_symmetry),
            "pixel_symmetry": float(pixel_symmetry),
            "contour_balance": float(contour_balance),
            "midline_x": int(midline),
        }
    
    def _split_at_midline(
        self, image: np.ndarray, midline: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Split image at midline and flip right side for comparison."""
        left = image[:, :midline]
        right = image[:, midline:]
        
        # Flip right side horizontally for comparison
        right_flipped = np.fliplr(right)
        
        # Make same size (use smaller width)
        min_width = min(left.shape[1], right_flipped.shape[1])
        left = left[:, :min_width]
        right_flipped = right_flipped[:, :min_width]
        
        return left, right_flipped
    
    def _ssim_symmetry(self, left: np.ndarray, right: np.ndarray) -> float:
        """Calculate structural similarity between left and right halves."""
        if left.shape != right.shape or left.size == 0:
            return 0.0
        
        try:
            # Ensure minimum size for SSIM
            if min(left.shape) < 7:
                return self._pixel_symmetry(left, right)
            
            score = ssim(left, right, data_range=255)
            return max(0.0, min(1.0, (score + 1) / 2))  # Normalize to 0-1
        except Exception:
            return 0.0
    
    def _correlation_symmetry(self, left: np.ndarray, right: np.ndarray) -> float:
        """Calculate normalized cross-correlation between halves."""
        if left.shape != right.shape or left.size == 0:
            return 0.0
        
        left_flat = left.flatten().astype(float)
        right_flat = right.flatten().astype(float)
        
        left_norm = left_flat - np.mean(left_flat)
        right_norm = right_flat - np.mean(right_flat)
        
        left_std = np.std(left_flat)
        right_std = np.std(right_flat)
        
        if left_std == 0 or right_std == 0:
            return 0.0
        
        correlation = np.sum(left_norm * right_norm) / (len(left_flat) * left_std * right_std)
        
        return max(0.0, min(1.0, (correlation + 1) / 2))
    
    def _histogram_symmetry(self, left: np.ndarray, right: np.ndarray) -> float:
        """Calculate histogram similarity between halves."""
        if left.size == 0 or right.size == 0:
            return 0.0
        
        # Calculate histograms
        hist_left = cv2.calcHist([left.astype(np.uint8)], [0], None, [256], [0, 256])
        hist_right = cv2.calcHist([right.astype(np.uint8)], [0], None, [256], [0, 256])
        
        # Normalize histograms
        cv2.normalize(hist_left, hist_left)
        cv2.normalize(hist_right, hist_right)
        
        # Compare using correlation
        similarity = cv2.compareHist(hist_left, hist_right, cv2.HISTCMP_CORREL)
        
        return max(0.0, min(1.0, (similarity + 1) / 2))
    
    def _color_histogram_symmetry(self, left: np.ndarray, right: np.ndarray) -> float:
        """Calculate color histogram similarity between halves."""
        if len(left.shape) < 3 or len(right.shape) < 3:
            return self._histogram_symmetry(left, right)
        
        if left.size == 0 or right.size == 0:
            return 0.0
        
        # Convert to HSV
        left_hsv = cv2.cvtColor(left.astype(np.uint8), cv2.COLOR_RGB2HSV)
        right_hsv = cv2.cvtColor(right.astype(np.uint8), cv2.COLOR_RGB2HSV)
        
        # Calculate hue histograms
        hist_left = cv2.calcHist([left_hsv], [0], None, [36], [0, 180])
        hist_right = cv2.calcHist([right_hsv], [0], None, [36], [0, 180])
        
        # Normalize
        cv2.normalize(hist_left, hist_left)
        cv2.normalize(hist_right, hist_right)
        
        # Compare
        similarity = cv2.compareHist(hist_left, hist_right, cv2.HISTCMP_CORREL)
        
        return max(0.0, min(1.0, (similarity + 1) / 2))
    
    def _pixel_symmetry(self, left: np.ndarray, right: np.ndarray) -> float:
        """Calculate pixel-wise symmetry (normalized MSE inverse)."""
        if left.shape != right.shape or left.size == 0:
            return 0.0
        
        mse = np.mean((left.astype(float) - right.astype(float)) ** 2)
        max_mse = 255 ** 2
        
        return 1.0 - (mse / max_mse)
    
    def _contour_balance(self, left: np.ndarray, right: np.ndarray) -> float:
        """Calculate balance of contour areas between halves."""
        # Threshold
        _, left_bin = cv2.threshold(left.astype(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        _, right_bin = cv2.threshold(right.astype(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        left_area = np.sum(left_bin > 0)
        right_area = np.sum(right_bin > 0)
        
        total = left_area + right_area
        if total == 0:
            return 1.0
        
        # Balance is 1 when equal, 0 when completely unbalanced
        balance = 1.0 - abs(left_area - right_area) / total
        
        return balance
    
    def calculate_zone_symmetry(
        self, image: np.ndarray, zone_masks: Dict[str, np.ndarray]
    ) -> Dict[str, Dict]:
        """Calculate symmetry for each zone."""
        results = {}
        
        for zone_name, mask in zone_masks.items():
            if mask is not None and np.any(mask):
                results[zone_name] = self.calculate(image, mask)
            else:
                results[zone_name] = self._empty_metrics()
        
        return results
    
    def _empty_metrics(self) -> Dict:
        """Return empty metrics."""
        return {
            "body_symmetry": 0.0,
            "ssim_symmetry": 0.0,
            "correlation_symmetry": 0.0,
            "histogram_symmetry": 0.0,
            "color_symmetry": 0.0,
            "pixel_symmetry": 0.0,
            "contour_balance": 0.0,
            "midline_x": 0,
        }
