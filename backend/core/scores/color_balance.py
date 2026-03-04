"""
Color Balance Score Calculation

Components and Weights:
- Color Distribution Uniformity: 30%
- Hue Balance: 25%
- Saturation Consistency: 20%
- Color Coherence: 15%
- Color Symmetry: 10%
"""
from typing import Dict, Any
import numpy as np


class ColorBalanceScoreCalculator:
    """Calculator class for Color Balance Score."""
    
    def calculate(self, metrics: Dict[str, Any]) -> int:
        """Calculate color balance score from metrics."""
        return calculate_color_balance_score(metrics)
    
    def interpret(self, score: int) -> str:
        """Get interpretation for score."""
        return interpret_color_balance_score(score)


def calculate_color_balance_score(metrics: Dict[str, Any]) -> int:
    """
    Calculate Color Balance Score (0-100 scale).
    
    Args:
        metrics: Dictionary containing color-related metrics
    
    Returns:
        Color Balance score as integer 0-100
    """
    # Color entropy (higher = more uniform distribution, normalize to 0-1)
    entropy = metrics.get('colorEntropy', 5.0)
    uniformity = min(entropy / 7.0, 1.0)
    
    # Hue balance (check coverage across spectrum)
    hue_dist = metrics.get('hueDistribution', [])
    if len(hue_dist) > 0:
        hue_array = np.array(hue_dist)
        hue_coverage = np.sum(hue_array > 0.01) / len(hue_array)
    else:
        hue_coverage = 0.5
    
    # Saturation consistency (inverse of saturation variance)
    sat_dist = metrics.get('saturationDistribution', [])
    if len(sat_dist) > 0:
        sat_array = np.array(sat_dist)
        sat_variance = np.var(sat_array)
        sat_consistency = 1 - min(sat_variance * 1000, 1.0)
    else:
        sat_consistency = 0.5
    
    # Color coherence (already 0-1)
    coherence = metrics.get('colorCoherence', 0.5)
    
    # Color symmetry (already 0-1)
    symmetry = max(0, metrics.get('colorSymmetry', 0.5))
    
    # Calculate weighted combination
    raw_score = (
        0.30 * uniformity +
        0.25 * hue_coverage +
        0.20 * sat_consistency +
        0.15 * coherence +
        0.10 * symmetry
    )
    
    return int(raw_score * 100)


def interpret_color_balance_score(score: int) -> str:
    """
    Get interpretation text for color balance score.
    
    Args:
        score: Color Balance score 0-100
    
    Returns:
        Interpretation string
    """
    if score >= 86:
        return "Excellent color harmony"
    elif score >= 71:
        return "Good color balance"
    elif score >= 51:
        return "Moderate color balance"
    elif score >= 31:
        return "Poor color balance"
    else:
        return "Imbalanced/skewed colors"
