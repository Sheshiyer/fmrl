"""
Energy Score Calculation

Components and Weights:
- Light Quanta Density: 30%
- Average Intensity: 25%
- Energy Analysis: 25%
- Normalized Area: 20%
"""
from typing import Dict, Any, Optional


class EnergyScoreCalculator:
    """Calculator class for Energy Score."""
    
    def calculate(self, metrics: Dict[str, Any], baseline: Optional[Dict[str, Any]] = None) -> int:
        """Calculate energy score from metrics."""
        return calculate_energy_score(metrics, baseline)
    
    def interpret(self, score: int) -> str:
        """Get interpretation for score."""
        return interpret_energy_score(score)


def calculate_energy_score(
    metrics: Dict[str, Any],
    baseline: Optional[Dict[str, Any]] = None
) -> int:
    """
    Calculate Energy Score (0-100 scale).
    
    Args:
        metrics: Dictionary containing basic metrics
        baseline: Optional baseline metrics for comparison
    
    Returns:
        Energy score as integer 0-100
    """
    # Extract metrics with defaults
    lqd = metrics.get('lightQuantaDensity', 0)
    avg_intensity = metrics.get('avgIntensity', 0)
    energy = metrics.get('energy', 0)
    normalized_area = metrics.get('normalizedArea', 0)
    
    # Normalize inputs to 0-1 scale
    lqd_norm = min(lqd, 1.0)
    intensity_norm = avg_intensity / 255.0
    
    # Normalize energy (needs baseline or default range)
    if baseline and 'energy' in baseline:
        baseline_energy = baseline['energy']
        energy_norm = min(energy / (baseline_energy * 2 + 1), 1.0)
    else:
        # Use pixel count to normalize energy
        pixel_count = metrics.get('pixelCount', 1)
        max_energy = pixel_count * 255
        energy_norm = min(energy / (max_energy + 1), 1.0)
    
    # Normalize area (cap at 1.5)
    area_norm = min(normalized_area / 1.5, 1.0)
    
    # Calculate weighted combination
    raw_score = (
        0.30 * lqd_norm +
        0.25 * intensity_norm +
        0.25 * energy_norm +
        0.20 * area_norm
    )
    
    # Scale to 0-100
    return int(raw_score * 100)


def interpret_energy_score(score: int) -> str:
    """
    Get interpretation text for energy score.
    
    Args:
        score: Energy score 0-100
    
    Returns:
        Interpretation string
    """
    if score >= 86:
        return "High energy emission"
    elif score >= 71:
        return "Above average energy"
    elif score >= 51:
        return "Normal/average energy"
    elif score >= 31:
        return "Below average energy"
    else:
        return "Low energy emission"
