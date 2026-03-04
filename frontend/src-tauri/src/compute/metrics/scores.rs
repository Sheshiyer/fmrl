use crate::compute::types::{
    AdvancedSymmetryMetrics, BasicMetrics, ColorMetrics, CompositeScores, GeometricMetrics,
    NonlinearMetrics,
};

fn unit_or(value: f32, default: f32) -> f32 {
    if value.is_finite() {
        value.clamp(0.0, 1.0)
    } else {
        default.clamp(0.0, 1.0)
    }
}

fn to_score100(raw: f32) -> u8 {
    let safe_raw = if raw.is_finite() {
        raw.clamp(0.0, 1.0)
    } else {
        0.0
    };

    // Python parity: int(raw_score * 100) truncates instead of rounds.
    (safe_raw * 100.0).clamp(0.0, 100.0) as u8
}

pub fn compute(
    basic: &BasicMetrics,
    color: &ColorMetrics,
    geometric: &GeometricMetrics,
    nonlinear: &NonlinearMetrics,
    advanced_symmetry: &AdvancedSymmetryMetrics,
) -> CompositeScores {
    // Energy score parity mapping adapted from backend/core/scores/energy.py
    let lqd_norm = unit_or(basic.dynamic_range, 0.0);
    let intensity_norm = unit_or(basic.intensity_mean, 0.0);
    let energy_norm = unit_or((basic.intensity_std_dev + color.chroma_energy) / 2.0, 0.0);
    let area_norm = unit_or(geometric.center_weighted_intensity / 1.5, 0.0);

    let energy_raw = (0.30 * lqd_norm) + (0.25 * intensity_norm) + (0.25 * energy_norm) + (0.20 * area_norm);

    // Coherence score parity mapping adapted from backend/core/scores/coherence.py
    let pattern_regularity = unit_or(advanced_symmetry.body_symmetry, 0.5);
    let temporal_stability = unit_or(1.0 - basic.intensity_std_dev, 0.5);
    let hurst_norm = unit_or((nonlinear.hurst_exponent - 0.5) * 2.0, 0.0);
    let color_coherence = unit_or((advanced_symmetry.color_symmetry + color.channel_balance) / 2.0, 0.5);

    let coherence_raw = (0.35 * pattern_regularity)
        + (0.25 * temporal_stability)
        + (0.25 * hurst_norm)
        + (0.15 * color_coherence);

    CompositeScores {
        energy_score: to_score100(energy_raw),
        coherence_score: to_score100(coherence_raw),
    }
}
