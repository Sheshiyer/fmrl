pub mod basic;
pub mod color;
pub mod consistency;
pub mod geometric;
pub mod nonlinear;
pub mod scores;
pub mod symmetry;

use crate::compute::buffer::FrameBuffer;
use crate::compute::types::{
    AdvancedSymmetryMetrics, BasicMetrics, ColorMetrics, CompositeScores, GeometricMetrics,
    NonlinearMetrics,
};

pub fn compute_metric_families(
    frame: &FrameBuffer,
) -> (
    BasicMetrics,
    ColorMetrics,
    GeometricMetrics,
    NonlinearMetrics,
    AdvancedSymmetryMetrics,
    CompositeScores,
) {
    let basic_metrics = basic::compute(frame);
    let color_metrics = color::compute(frame);
    let geometric_metrics = geometric::compute(frame);
    let nonlinear_metrics = nonlinear::compute(frame);
    let symmetry_metrics = symmetry::compute(frame);
    let score_metrics = scores::compute(
        &basic_metrics,
        &color_metrics,
        &geometric_metrics,
        &nonlinear_metrics,
        &symmetry_metrics,
    );

    (
        basic_metrics,
        color_metrics,
        geometric_metrics,
        nonlinear_metrics,
        symmetry_metrics,
        score_metrics,
    )
}
