"""
Coherence Score Calculation

Components and Weights:
- Pattern Regularity: 35%
- Temporal Stability: 25%
- Hurst Exponent: 25%
- Color Coherence: 15%
"""
from typing import Dict, Any


class CoherenceScoreCalculator:
    """Calculator class for Coherence Score."""
    
    def calculate(self, metrics: Dict[str, Any]) -> int:
        """Calculate coherence score from metrics."""
        return calculate_coherence_score(metrics)
    
    def interpret(self, score: int) -> str:
        """Get interpretation for score."""
        return interpret_coherence_score(score)


def calculate_coherence_score(metrics: Dict[str, Any]) -> int:
    """
    Calculate Coherence Score (0-100 scale).
    
    Args:
        metrics: Dictionary containing coherence-related metrics
    
    Returns:
        Coherence score as integer 0-100
    """
    # Pattern regularity (should already be 0-1)
    pattern_reg = metrics.get('patternRegularity', 0.5)
    
    # Temporal stability (1 - normalized variance)
    temporal_stab = metrics.get('temporalStability', 0.5)
    
    # Hurst exponent (map 0.5-1.0 to 0-1, values below 0.5 are anti-persistent)
    hurst = metrics.get('hurstExponent', 0.5)
    hurst_norm = max(0, min(1, (hurst - 0.5) * 2))
    
    # Color coherence (already 0-1)
    color_coh = metrics.get('colorCoherence', 0.5)
    
    # Calculate weighted combination
    raw_score = (
        0.35 * pattern_reg +
        0.25 * temporal_stab +
        0.25 * hurst_norm +
        0.15 * color_coh
    )
    
    return int(raw_score * 100)


def interpret_coherence_score(score: int) -> str:
    """
    Get interpretation text for coherence score.
    
    Args:
        score: Coherence score 0-100
    
    Returns:
        Interpretation string
    """
    if score >= 86:
        return "Highly coherent/ordered patterns"
    elif score >= 71:
        return "Good coherence"
    elif score >= 51:
        return "Moderate coherence"
    elif score >= 31:
        return "Low coherence"
    else:
        return "Chaotic/disordered patterns"
