"""
Symmetry Score Calculation

Components and Weights:
- Body Symmetry (SSIM): 50%
- Contour Complexity Balance: 30%
- Color Symmetry: 20%
"""
from typing import Dict, Any


class SymmetryScoreCalculator:
    """Calculator class for Symmetry Score."""
    
    def calculate(self, metrics: Dict[str, Any]) -> int:
        """Calculate symmetry score from metrics."""
        return calculate_symmetry_score(metrics)
    
    def interpret(self, score: int) -> str:
        """Get interpretation for score."""
        return interpret_symmetry_score(score)


def calculate_symmetry_score(metrics: Dict[str, Any]) -> int:
    """
    Calculate Symmetry Score (0-100 scale).
    
    Args:
        metrics: Dictionary containing symmetry metrics
    
    Returns:
        Symmetry score as integer 0-100
    """
    # Extract symmetry metrics
    body_symmetry = metrics.get('bodySymmetry', {})
    body_sym_combined = body_symmetry.get('combined', 0.5) if isinstance(body_symmetry, dict) else body_symmetry
    
    # Contour complexity balance
    left_complexity = metrics.get('leftContourComplexity', 1.0)
    right_complexity = metrics.get('rightContourComplexity', 1.0)
    
    if max(left_complexity, right_complexity) > 0:
        complexity_ratio = min(left_complexity, right_complexity) / (max(left_complexity, right_complexity) + 1e-6)
    else:
        complexity_ratio = 0.5
    
    # Color symmetry (should already be 0-1 from correlation)
    color_sym = max(0, metrics.get('colorSymmetry', 0.5))
    
    # Calculate weighted combination
    raw_score = (
        0.50 * body_sym_combined +
        0.30 * complexity_ratio +
        0.20 * color_sym
    )
    
    return int(raw_score * 100)


def interpret_symmetry_score(score: int) -> str:
    """
    Get interpretation text for symmetry score.
    
    Args:
        score: Symmetry score 0-100
    
    Returns:
        Interpretation string
    """
    if score >= 81:
        return "Excellent bilateral balance"
    elif score >= 61:
        return "Good symmetry"
    elif score >= 41:
        return "Moderate asymmetry"
    else:
        return "Significant asymmetry"
