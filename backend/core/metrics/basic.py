"""
Basic metrics for PIP analysis
"""
import numpy as np
from typing import Dict, Any, Optional


class BasicMetrics:
    """Calculate basic intensity and area metrics."""
    
    @staticmethod
    def calculate_all(image: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Calculate all basic metrics for an image.
        
        Args:
            image: Input image (grayscale or BGR)
            mask: Optional ROI mask (255 = include, 0 = exclude)
        
        Returns:
            Dictionary of metric values
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            import cv2
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Apply mask if provided
        if mask is not None:
            pixels = gray[mask > 0]
        else:
            pixels = gray.flatten()
        
        if len(pixels) == 0:
            return BasicMetrics._empty_metrics()
        
        # Calculate intensity metrics
        avg_intensity = float(np.mean(pixels))
        intensity_std = float(np.std(pixels))
        max_intensity = float(np.max(pixels))
        min_intensity = float(np.min(pixels))
        
        # Calculate area metrics
        total_pixels = len(pixels)
        threshold = avg_intensity + 0.5 * intensity_std
        above_threshold = np.sum(pixels > threshold)
        light_quanta_density = above_threshold / total_pixels if total_pixels > 0 else 0
        
        # Calculate noise metrics
        inner_noise = intensity_std
        inner_noise_percent = (intensity_std / avg_intensity * 100) if avg_intensity > 0 else 0
        
        # Calculate energy (integrated intensity)
        energy = float(np.sum(pixels.astype(np.float64)))
        
        return {
            'avgIntensity': avg_intensity,
            'intensityStdDev': intensity_std,
            'maxIntensity': max_intensity,
            'minIntensity': min_intensity,
            'lightQuantaDensity': light_quanta_density,
            'normalizedArea': total_pixels / (gray.shape[0] * gray.shape[1]),
            'innerNoise': inner_noise,
            'innerNoisePercent': inner_noise_percent,
            'energy': energy,
            'pixelCount': total_pixels
        }
    
    @staticmethod
    def _empty_metrics() -> Dict[str, Any]:
        """Return empty metric values."""
        return {
            'avgIntensity': 0,
            'intensityStdDev': 0,
            'maxIntensity': 0,
            'minIntensity': 0,
            'lightQuantaDensity': 0,
            'normalizedArea': 0,
            'innerNoise': 0,
            'innerNoisePercent': 0,
            'energy': 0,
            'pixelCount': 0
        }
    
    @staticmethod
    def calculate_intensity(image: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict[str, float]:
        """Calculate only intensity metrics."""
        if len(image.shape) == 3:
            import cv2
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        if mask is not None:
            pixels = gray[mask > 0]
        else:
            pixels = gray.flatten()
        
        if len(pixels) == 0:
            return {'avg': 0, 'std': 0, 'max': 0, 'min': 0}
        
        return {
            'avg': float(np.mean(pixels)),
            'std': float(np.std(pixels)),
            'max': float(np.max(pixels)),
            'min': float(np.min(pixels))
        }
    
    @staticmethod
    def calculate_lqd(
        image: np.ndarray, 
        threshold: Optional[float] = None,
        mask: Optional[np.ndarray] = None
    ) -> float:
        """
        Calculate Light Quanta Density.
        
        Args:
            image: Input image (grayscale)
            threshold: Intensity threshold (default: adaptive)
            mask: Optional ROI mask
        
        Returns:
            LQD value (0-1)
        """
        if len(image.shape) == 3:
            import cv2
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        if mask is not None:
            pixels = gray[mask > 0]
        else:
            pixels = gray.flatten()
        
        if len(pixels) == 0:
            return 0.0
        
        if threshold is None:
            threshold = np.mean(pixels) + 0.5 * np.std(pixels)
        
        above_threshold = np.sum(pixels > threshold)
        return above_threshold / len(pixels)
