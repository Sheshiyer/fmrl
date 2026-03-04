use crate::compute::buffer::{FrameBuffer, PixelFormat};
use crate::compute::types::ColorMetrics;

pub fn compute(frame: &FrameBuffer) -> ColorMetrics {
    if frame.bytes.is_empty() || frame.pixel_count() == 0 {
        return ColorMetrics {
            channel_balance: 0.0,
            saturation_mean: 0.0,
            chroma_energy: 0.0,
        };
    }

    let channels = frame.format.channels();

    if matches!(frame.format, PixelFormat::Gray8) {
        return ColorMetrics {
            channel_balance: 1.0,
            saturation_mean: 0.0,
            chroma_energy: 0.0,
        };
    }

    let mut sum_r = 0.0f64;
    let mut sum_g = 0.0f64;
    let mut sum_b = 0.0f64;
    let mut sat_sum = 0.0f64;
    let mut chroma_sum = 0.0f64;

    for px in frame.bytes.chunks(channels) {
        let r = px.first().copied().unwrap_or(0) as f64;
        let g = px.get(1).copied().unwrap_or(0) as f64;
        let b = px.get(2).copied().unwrap_or(0) as f64;

        sum_r += r;
        sum_g += g;
        sum_b += b;

        let max_c = r.max(g).max(b);
        let min_c = r.min(g).min(b);
        let chroma = max_c - min_c;
        let sat = if max_c > 0.0 { chroma / max_c } else { 0.0 };

        sat_sum += sat;
        chroma_sum += chroma / 255.0;
    }

    let count = frame.pixel_count() as f64;
    let mean_r = sum_r / count;
    let mean_g = sum_g / count;
    let mean_b = sum_b / count;
    let mean_rgb = (mean_r + mean_g + mean_b) / 3.0;

    let balance = if mean_rgb > 0.0 {
        let dr = (mean_r - mean_rgb).abs() / mean_rgb;
        let dg = (mean_g - mean_rgb).abs() / mean_rgb;
        let db = (mean_b - mean_rgb).abs() / mean_rgb;
        (1.0 - ((dr + dg + db) / 3.0)).clamp(0.0, 1.0)
    } else {
        0.0
    };

    ColorMetrics {
        channel_balance: balance as f32,
        saturation_mean: (sat_sum / count).clamp(0.0, 1.0) as f32,
        chroma_energy: (chroma_sum / count).clamp(0.0, 1.0) as f32,
    }
}
