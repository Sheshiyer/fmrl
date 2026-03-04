"""
Complexity Score Calculation

Components and Weights:
- Fractal Dimension: 30%
- Color Entropy: 25%
- Correlation Dimension: 20%
- Contour Complexity: 15%
- Inner Noise: 10%
"""
from typing import Dict, Any


class ComplexityScoreCalculator:
    """Calculator class for Complexity Score."""
    
    def calculate(self, metrics: Dict[str, Any]) -> int:
        """Calculate complexity score from metrics."""
        return calculate_complexity_score(metrics)
    
    def interpret(self, score: int) -> str:
        """Get interpretation for score."""
        return interpret_complexity_score(score)


def calculate_complexity_score(metrics: Dict[str, Any]) -> int:
    """
    Calculate Complexity Score (0-100 scale).
    
    Args:
        metrics: Dictionary containing complexity-related metrics
    
    Returns:
        Complexity score as integer 0-100
    """
    # Fractal dimension (map 1.0-2.0 to 0-1)
    fd = metrics.get('fractalDimension', 1.5)
    fd_norm = max(0, min(1, fd - 1.0))
    
    # Color entropy (map typical range 3-8 bits to 0-1)
    entropy = metrics.get('colorEntropy', 5.0)
    entropy_norm = max(0, min(1, (entropy - 3) / 5))
    
    # Correlation dimension (use fractional part as complexity indicator)
    corr_dim = metrics.get('correlationDimension', 2.0)
    corr_dim_norm = corr_dim % 1
    
    # Contour complexity (fractal dimension of boundary, map 1.0-2.0 to 0-1)
    contour_comp = metrics.get('contourComplexity', 1.2)
    contour_norm = max(0, min(1, contour_comp - 1.0))
    
    # Inner noise (normalize to typical range 0-50%)
    noise_percent = metrics.get('innerNoisePercent', 20)
    noise_norm = min(noise_percent / 50, 1.0)
    
    # Calculate weighted combination
    raw_score = (
        0.30 * fd_norm +
        0.25 * entropy_norm +
        0.20 * corr_dim_norm +
        0.15 * contour_norm +
        0.10 * noise_norm
    )
    
    return int(raw_score * 100)


def interpret_complexity_score(score: int) -> str:
    """
    Get interpretation text for complexity score.
    
    Args:
        score: Complexity score 0-100
    
    Returns:
        Interpretation string
    """
    if score >= 86:
        return "Very complex/chaotic patterns"
    elif score >= 71:
        return "High complexity"
    elif score >= 51:
        return "Moderate complexity"
    elif score >= 31:
        return "Low complexity"
    else:
        return "Simple, regular patterns"
