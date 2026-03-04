pub mod buffer;
pub mod metrics;
pub mod types;

use buffer::FrameBuffer;
use metrics::compute_metric_families;
use types::{
    AdvancedSymmetryMetrics, BasicMetrics, ColorMetrics, CompositeScores, ComputeInput,
    ComputeOutput, ConsistencyCheck, GeometricMetrics, NonlinearMetrics,
};

fn zero_basic() -> BasicMetrics {
    BasicMetrics {
        intensity_mean: 0.0,
        intensity_std_dev: 0.0,
        dynamic_range: 0.0,
    }
}

fn zero_color() -> ColorMetrics {
    ColorMetrics {
        channel_balance: 0.0,
        saturation_mean: 0.0,
        chroma_energy: 0.0,
    }
}

fn zero_geometric() -> GeometricMetrics {
    GeometricMetrics {
        horizontal_symmetry: 0.0,
        vertical_symmetry: 0.0,
        center_weighted_intensity: 0.0,
    }
}

fn zero_nonlinear() -> NonlinearMetrics {
    NonlinearMetrics {
        fractal_dimension: 1.0,
        hurst_exponent: 0.5,
        lyapunov_exponent: 0.0,
        correlation_dimension: 2.0,
        dfa_alpha: 1.0,
        sample_entropy: 0.0,
    }
}

fn zero_advanced_symmetry() -> AdvancedSymmetryMetrics {
    AdvancedSymmetryMetrics {
        body_symmetry: 0.0,
        ssim_symmetry: 0.0,
        correlation_symmetry: 0.0,
        histogram_symmetry: 0.0,
        color_symmetry: 0.0,
        pixel_symmetry: 0.0,
        contour_balance: 0.0,
        midline_x: 0,
    }
}

fn zero_scores() -> CompositeScores {
    CompositeScores {
        energy_score: 0,
        coherence_score: 0,
    }
}

fn zero_consistency() -> ConsistencyCheck {
    ConsistencyCheck {
        passed: false,
        warnings: vec!["compute pipeline fallback output generated".to_string()],
        parity_gate_ready: false,
    }
}

fn finite_or(value: f32, default: f32) -> f32 {
    if value.is_finite() {
        value
    } else {
        default
    }
}

fn clamp_unit(value: f32, default: f32) -> f32 {
    finite_or(value, default).clamp(0.0, 1.0)
}

fn sanitize_basic(metrics: BasicMetrics) -> BasicMetrics {
    BasicMetrics {
        intensity_mean: clamp_unit(metrics.intensity_mean, 0.0),
        intensity_std_dev: clamp_unit(metrics.intensity_std_dev, 0.0),
        dynamic_range: clamp_unit(metrics.dynamic_range, 0.0),
    }
}

fn sanitize_color(metrics: ColorMetrics) -> ColorMetrics {
    ColorMetrics {
        channel_balance: clamp_unit(metrics.channel_balance, 0.0),
        saturation_mean: clamp_unit(metrics.saturation_mean, 0.0),
        chroma_energy: clamp_unit(metrics.chroma_energy, 0.0),
    }
}

fn sanitize_geometric(metrics: GeometricMetrics) -> GeometricMetrics {
    GeometricMetrics {
        horizontal_symmetry: clamp_unit(metrics.horizontal_symmetry, 0.0),
        vertical_symmetry: clamp_unit(metrics.vertical_symmetry, 0.0),
        center_weighted_intensity: clamp_unit(metrics.center_weighted_intensity, 0.0),
    }
}

fn sanitize_nonlinear(metrics: NonlinearMetrics) -> NonlinearMetrics {
    NonlinearMetrics {
        fractal_dimension: finite_or(metrics.fractal_dimension, 1.0).clamp(1.0, 2.0),
        hurst_exponent: clamp_unit(metrics.hurst_exponent, 0.5),
        lyapunov_exponent: finite_or(metrics.lyapunov_exponent, 0.0).clamp(-5.0, 5.0),
        correlation_dimension: finite_or(metrics.correlation_dimension, 2.0).clamp(1.0, 10.0),
        dfa_alpha: finite_or(metrics.dfa_alpha, 1.0).clamp(0.0, 2.0),
        sample_entropy: finite_or(metrics.sample_entropy, 0.0).clamp(0.0, 5.0),
    }
}

fn sanitize_advanced_symmetry(metrics: AdvancedSymmetryMetrics, width: u32) -> AdvancedSymmetryMetrics {
    AdvancedSymmetryMetrics {
        body_symmetry: clamp_unit(metrics.body_symmetry, 0.0),
        ssim_symmetry: clamp_unit(metrics.ssim_symmetry, 0.0),
        correlation_symmetry: clamp_unit(metrics.correlation_symmetry, 0.0),
        histogram_symmetry: clamp_unit(metrics.histogram_symmetry, 0.0),
        color_symmetry: clamp_unit(metrics.color_symmetry, 0.0),
        pixel_symmetry: clamp_unit(metrics.pixel_symmetry, 0.0),
        contour_balance: clamp_unit(metrics.contour_balance, 0.0),
        midline_x: metrics.midline_x.min(width),
    }
}

fn sanitize_scores(scores: CompositeScores) -> CompositeScores {
    CompositeScores {
        energy_score: scores.energy_score.min(100),
        coherence_score: scores.coherence_score.min(100),
    }
}

pub fn run_compute_metrics(input: ComputeInput) -> ComputeOutput {
    let ComputeInput {
        width,
        height,
        format,
        bytes,
        frame_id,
        timestamp_ms: _,
    } = input;

    let byte_len = bytes.len();

    match FrameBuffer::try_new(width, height, format, bytes) {
        Ok(frame) => {
            let (basic, color, geometric, nonlinear, advanced_symmetry, scores) =
                compute_metric_families(&frame);

            let basic = sanitize_basic(basic);
            let color = sanitize_color(color);
            let geometric = sanitize_geometric(geometric);
            let nonlinear = sanitize_nonlinear(nonlinear);
            let advanced_symmetry = sanitize_advanced_symmetry(advanced_symmetry, frame.width);
            let scores = sanitize_scores(scores);
            let consistency = metrics::consistency::evaluate(
                &basic,
                &color,
                &geometric,
                &nonlinear,
                &advanced_symmetry,
                &scores,
            );

            ComputeOutput {
                ok: true,
                frame_id,
                width: frame.width,
                height: frame.height,
                channels: frame.format.channels() as u8,
                pixel_count: frame.pixel_count(),
                byte_len: frame.bytes.len(),
                basic,
                color,
                geometric,
                nonlinear,
                advanced_symmetry,
                scores,
                consistency,
                message: "Phase 2C compute metrics succeeded".to_string(),
            }
        }
        Err(error) => ComputeOutput {
            ok: false,
            frame_id,
            width,
            height,
            channels: format.channels() as u8,
            pixel_count: (width as usize).saturating_mul(height as usize),
            byte_len,
            basic: zero_basic(),
            color: zero_color(),
            geometric: zero_geometric(),
            nonlinear: zero_nonlinear(),
            advanced_symmetry: zero_advanced_symmetry(),
            scores: zero_scores(),
            consistency: zero_consistency(),
            message: format!("Phase 2C compute metrics failed validation: {error}"),
        },
    }
}
