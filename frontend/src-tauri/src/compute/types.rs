use serde::{Deserialize, Serialize};

use super::buffer::PixelFormat;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputeInput {
    pub width: u32,
    pub height: u32,
    pub format: PixelFormat,
    pub bytes: Vec<u8>,
    pub frame_id: Option<String>,
    pub timestamp_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BasicMetrics {
    pub intensity_mean: f32,
    pub intensity_std_dev: f32,
    pub dynamic_range: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorMetrics {
    pub channel_balance: f32,
    pub saturation_mean: f32,
    pub chroma_energy: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeometricMetrics {
    pub horizontal_symmetry: f32,
    pub vertical_symmetry: f32,
    pub center_weighted_intensity: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NonlinearMetrics {
    pub fractal_dimension: f32,
    pub hurst_exponent: f32,
    pub lyapunov_exponent: f32,
    pub correlation_dimension: f32,
    pub dfa_alpha: f32,
    pub sample_entropy: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedSymmetryMetrics {
    pub body_symmetry: f32,
    pub ssim_symmetry: f32,
    pub correlation_symmetry: f32,
    pub histogram_symmetry: f32,
    pub color_symmetry: f32,
    pub pixel_symmetry: f32,
    pub contour_balance: f32,
    pub midline_x: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompositeScores {
    pub energy_score: u8,
    pub coherence_score: u8,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsistencyCheck {
    pub passed: bool,
    pub warnings: Vec<String>,
    pub parity_gate_ready: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputeOutput {
    pub ok: bool,
    pub frame_id: Option<String>,
    pub width: u32,
    pub height: u32,
    pub channels: u8,
    pub pixel_count: usize,
    pub byte_len: usize,
    pub basic: BasicMetrics,
    pub color: ColorMetrics,
    pub geometric: GeometricMetrics,
    pub nonlinear: NonlinearMetrics,
    pub advanced_symmetry: AdvancedSymmetryMetrics,
    pub scores: CompositeScores,
    pub consistency: ConsistencyCheck,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputeMetricsResponse {
    pub runtime: &'static str,
    pub output: ComputeOutput,
}
