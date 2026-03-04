use crate::compute::types::{
    AdvancedSymmetryMetrics, BasicMetrics, ColorMetrics, CompositeScores, ConsistencyCheck,
    GeometricMetrics, NonlinearMetrics,
};

pub fn evaluate(
    basic: &BasicMetrics,
    color: &ColorMetrics,
    geometric: &GeometricMetrics,
    nonlinear: &NonlinearMetrics,
    symmetry: &AdvancedSymmetryMetrics,
    scores: &CompositeScores,
) -> ConsistencyCheck {
    let mut warnings = Vec::new();

    // Core range sanity checks
    if !(0.0..=1.0).contains(&basic.intensity_mean) {
        warnings.push("basic.intensity_mean out of [0,1]".to_string());
    }
    if !(0.0..=1.0).contains(&basic.intensity_std_dev) {
        warnings.push("basic.intensity_std_dev out of [0,1]".to_string());
    }
    if !(0.0..=1.0).contains(&color.channel_balance) {
        warnings.push("color.channel_balance out of [0,1]".to_string());
    }
    if !(0.0..=1.0).contains(&symmetry.body_symmetry) {
        warnings.push("advanced_symmetry.body_symmetry out of [0,1]".to_string());
    }
    if !(0.0..=1.0).contains(&nonlinear.hurst_exponent) {
        warnings.push("nonlinear.hurst_exponent out of [0,1]".to_string());
    }

    // Cross-module coupling checks
    let avg_spatial_symmetry = (geometric.horizontal_symmetry + geometric.vertical_symmetry) / 2.0;
    if (avg_spatial_symmetry - symmetry.body_symmetry).abs() > 0.65 {
        warnings.push(
            "large divergence between geometric symmetry and advanced body symmetry".to_string(),
        );
    }

    let expected_coherence_floor = ((symmetry.body_symmetry * 0.35)
        + ((1.0 - basic.intensity_std_dev) * 0.25)
        + (((nonlinear.hurst_exponent - 0.5) * 2.0).clamp(0.0, 1.0) * 0.25)
        + (((symmetry.color_symmetry + color.channel_balance) / 2.0) * 0.15))
        * 100.0;

    if (scores.coherence_score as f32) + 8.0 < expected_coherence_floor {
        warnings.push(
            "coherence_score significantly below expected weighted coherence composition"
                .to_string(),
        );
    }

    if scores.energy_score > 100 || scores.coherence_score > 100 {
        warnings.push("composite scores exceed 100 bound".to_string());
    }

    let passed = warnings.is_empty();
    let parity_gate_ready = passed
        && nonlinear.fractal_dimension.is_finite()
        && nonlinear.correlation_dimension.is_finite()
        && nonlinear.sample_entropy.is_finite();

    ConsistencyCheck {
        passed,
        warnings,
        parity_gate_ready,
    }
}
