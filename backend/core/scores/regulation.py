"""
Regulation Score Calculation

Components and Weights:
- Lyapunov Exponent: 30% (inverted - negative is stable)
- DFA Alpha: 25% (optimal near 1.0)
- Temporal Variance: 20% (inverted)
- Recurrence Rate: 15%
- Segmented Area Variability: 10% (inverted)
"""
from typing import Dict, Any


class RegulationScoreCalculator:
    """Calculator class for Regulation Score."""
    
    def calculate(self, metrics: Dict[str, Any]) -> int:
        """Calculate regulation score from metrics."""
        return calculate_regulation_score(metrics)
    
    def interpret(self, score: int) -> str:
        """Get interpretation for score."""
        return interpret_regulation_score(score)


def calculate_regulation_score(metrics: Dict[str, Any]) -> int:
    """
    Calculate Regulation Score (0-100 scale).
    
    Args:
        metrics: Dictionary containing regulation-related metrics
    
    Returns:
        Regulation score as integer 0-100
    """
    # Lyapunov exponent (negative = stable, map -0.5 to +0.5 to 1-0)
    lyap = metrics.get('lyapunovExponent', 0)
    lyap_norm = max(0, min(1, 0.5 - lyap))
    
    # DFA alpha (optimal around 1.0, map deviation to score)
    dfa = metrics.get('dfaAlpha', 1.0)
    dfa_norm = 1 - abs(dfa - 1.0)
    dfa_norm = max(0, min(1, dfa_norm))
    
    # Temporal variance (inverted - lower is better)
    temp_var = metrics.get('temporalVariance', 0.15)
    temp_var_norm = 1 - min(temp_var / 0.3, 1.0)
    
    # Recurrence rate (higher is more regulated)
    recurrence = metrics.get('recurrenceRate', 0.5)
    recurrence = max(0, min(1, recurrence))
    
    # Segmented area variability (inverted - lower is better)
    seg_var = metrics.get('segmentedAreaVariability', 0.2)
    seg_var_norm = 1 - min(seg_var / 0.5, 1.0)
    
    # Calculate weighted combination
    raw_score = (
        0.30 * lyap_norm +
        0.25 * dfa_norm +
        0.20 * temp_var_norm +
        0.15 * recurrence +
        0.10 * seg_var_norm
    )
    
    return int(raw_score * 100)


def interpret_regulation_score(score: int) -> str:
    """
    Get interpretation text for regulation score.
    
    Args:
        score: Regulation score 0-100
    
    Returns:
        Interpretation string
    """
    if score >= 86:
        return "Excellent regulation/homeostasis"
    elif score >= 71:
        return "Good regulation"
    elif score >= 51:
        return "Moderate regulation"
    elif score >= 31:
        return "Poor regulation"
    else:
        return "Dysregulated/chaotic"
