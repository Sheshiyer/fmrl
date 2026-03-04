"""
Color analysis metrics for PIP analysis
"""
import numpy as np
import cv2
from typing import Dict, Any, Optional
from scipy.stats import entropy


class ColorMetrics:
    """Calculate color-based metrics."""
    
    @staticmethod
    def calculate_all(image_rgb: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Calculate all color metrics.
        
        Args:
            image_rgb: RGB image
            mask: Optional ROI mask
        
        Returns:
            Dictionary of color metrics
        """
        # Convert to HSV
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        
        # Apply mask if provided
        if mask is not None:
            h_pixels = hsv[:, :, 0][mask > 0]
            s_pixels = hsv[:, :, 1][mask > 0]
            v_pixels = hsv[:, :, 2][mask > 0]
        else:
            h_pixels = hsv[:, :, 0].flatten()
            s_pixels = hsv[:, :, 1].flatten()
            v_pixels = hsv[:, :, 2].flatten()
        
        if len(h_pixels) == 0:
            return ColorMetrics._empty_metrics()
        
        # Hue histogram (0-180 in OpenCV)
        hue_hist, _ = np.histogram(h_pixels, bins=30, range=(0, 180))
        hue_hist = hue_hist / hue_hist.sum() if hue_hist.sum() > 0 else hue_hist
        
        # Saturation histogram
        sat_hist, _ = np.histogram(s_pixels, bins=32, range=(0, 256))
        sat_hist = sat_hist / sat_hist.sum() if sat_hist.sum() > 0 else sat_hist
        
        # Value histogram
        val_hist, _ = np.histogram(v_pixels, bins=32, range=(0, 256))
        val_hist = val_hist / val_hist.sum() if val_hist.sum() > 0 else val_hist
        
        # Dominant hue
        dominant_hue = np.argmax(hue_hist) * 6  # Convert to 0-180 range then to degrees
        
        # Mean values
        mean_saturation = float(np.mean(s_pixels))
        mean_value = float(np.mean(v_pixels))
        
        # Color entropy
        color_entropy = ColorMetrics.calculate_entropy(image_rgb, mask)
        
        # Color coherence
        color_coherence = ColorMetrics.calculate_coherence(image_rgb, mask)
        
        return {
            'dominantHue': float(dominant_hue * 2),  # Convert to 0-360
            'meanSaturation': mean_saturation,
            'meanValue': mean_value,
            'colorEntropy': color_entropy,
            'colorCoherence': color_coherence,
            'hueDistribution': hue_hist.tolist(),
            'saturationDistribution': sat_hist.tolist(),
            'valueDistribution': val_hist.tolist()
        }
    
    @staticmethod
    def _empty_metrics() -> Dict[str, Any]:
        """Return empty metric values."""
        return {
            'dominantHue': 0,
            'meanSaturation': 0,
            'meanValue': 0,
            'colorEntropy': 0,
            'colorCoherence': 0,
            'hueDistribution': [],
            'saturationDistribution': [],
            'valueDistribution': []
        }
    
    @staticmethod
    def calculate_entropy(image_rgb: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
        """
        Calculate Shannon entropy of color distribution.
        
        Args:
            image_rgb: RGB image
            mask: Optional ROI mask
        
        Returns:
            Entropy value (bits)
        """
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        
        # Calculate 3D histogram
        if mask is not None:
            hist = cv2.calcHist(
                [hsv], [0, 1, 2], mask,
                [30, 32, 32], [0, 180, 0, 256, 0, 256]
            )
        else:
            hist = cv2.calcHist(
                [hsv], [0, 1, 2], None,
                [30, 32, 32], [0, 180, 0, 256, 0, 256]
            )
        
        hist = hist.flatten()
        hist = hist / hist.sum() if hist.sum() > 0 else hist
        hist = hist[hist > 0]  # Remove zeros for entropy
        
        return float(entropy(hist, base=2)) if len(hist) > 0 else 0.0
    
    @staticmethod
    def calculate_coherence(
        image_rgb: np.ndarray, 
        mask: Optional[np.ndarray] = None,
        threshold: int = 25
    ) -> float:
        """
        Calculate color coherence using connected components.
        
        Args:
            image_rgb: RGB image
            mask: Optional ROI mask
            threshold: Minimum component size
        
        Returns:
            Coherence value (0-1)
        """
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        hue = hsv[:, :, 0]
        
        # Quantize hue to major color bands
        hue_quantized = (hue // 30) * 30
        
        total_pixels = image_rgb.shape[0] * image_rgb.shape[1]
        if mask is not None:
            total_pixels = np.sum(mask > 0)
        
        if total_pixels == 0:
            return 0.0
        
        coherent_pixels = 0
        
        for hue_val in range(0, 180, 30):
            band_mask = (hue_quantized == hue_val).astype(np.uint8)
            
            if mask is not None:
                band_mask = cv2.bitwise_and(band_mask, band_mask, mask=mask)
            
            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(band_mask)
            
            for i in range(1, num_labels):
                area = stats[i, cv2.CC_STAT_AREA]
                if area > threshold:
                    coherent_pixels += area
        
        return float(coherent_pixels / total_pixels)
    
    @staticmethod
    def calculate_symmetry(image_rgb: np.ndarray, midline_x: Optional[int] = None) -> float:
        """
        Calculate color symmetry between left and right halves.
        
        Args:
            image_rgb: RGB image
            midline_x: X coordinate of vertical midline (default: center)
        
        Returns:
            Symmetry score (0-1, higher = more symmetric)
        """
        h, w = image_rgb.shape[:2]
        
        if midline_x is None:
            midline_x = w // 2
        
        # Split into left and right
        left = image_rgb[:, :midline_x]
        right_width = min(midline_x, w - midline_x)
        right = np.fliplr(image_rgb[:, midline_x:midline_x + right_width])
        
        # Ensure same size
        min_width = min(left.shape[1], right.shape[1])
        left = left[:, :min_width]
        right = right[:, :min_width]
        
        if left.size == 0 or right.size == 0:
            return 0.0
        
        # Convert to HSV
        left_hsv = cv2.cvtColor(left, cv2.COLOR_RGB2HSV)
        right_hsv = cv2.cvtColor(right, cv2.COLOR_RGB2HSV)
        
        # Calculate histograms
        left_hist = cv2.calcHist([left_hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
        right_hist = cv2.calcHist([right_hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
        
        # Normalize
        left_hist = cv2.normalize(left_hist, left_hist).flatten()
        right_hist = cv2.normalize(right_hist, right_hist).flatten()
        
        # Compare using correlation
        correlation = cv2.compareHist(left_hist, right_hist, cv2.HISTCMP_CORREL)
        
        return float(max(0, correlation))
