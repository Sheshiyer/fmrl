use crate::compute::buffer::{FrameBuffer, PixelFormat};
use crate::compute::types::GeometricMetrics;

fn luminance(frame: &FrameBuffer, x: usize, y: usize) -> f32 {
    let width = frame.width as usize;
    let channels = frame.format.channels();
    let idx = (y * width + x) * channels;

    match frame.format {
        PixelFormat::Gray8 => frame.bytes.get(idx).copied().unwrap_or(0) as f32,
        PixelFormat::Rgb8 | PixelFormat::Rgba8 => {
            let r = frame.bytes.get(idx).copied().unwrap_or(0) as f32;
            let g = frame.bytes.get(idx + 1).copied().unwrap_or(0) as f32;
            let b = frame.bytes.get(idx + 2).copied().unwrap_or(0) as f32;
            (0.2126 * r) + (0.7152 * g) + (0.0722 * b)
        }
    }
}

pub fn compute(frame: &FrameBuffer) -> GeometricMetrics {
    if frame.bytes.is_empty() || frame.pixel_count() == 0 {
        return GeometricMetrics {
            horizontal_symmetry: 0.0,
            vertical_symmetry: 0.0,
            center_weighted_intensity: 0.0,
        };
    }

    let width = frame.width as usize;
    let height = frame.height as usize;

    let mut h_diff_sum = 0.0f64;
    let mut h_count = 0usize;
    for y in 0..height {
        for x in 0..(width / 2) {
            let left = luminance(frame, x, y);
            let right = luminance(frame, width - 1 - x, y);
            h_diff_sum += (left - right).abs() as f64 / 255.0;
            h_count += 1;
        }
    }

    let mut v_diff_sum = 0.0f64;
    let mut v_count = 0usize;
    for y in 0..(height / 2) {
        for x in 0..width {
            let top = luminance(frame, x, y);
            let bottom = luminance(frame, x, height - 1 - y);
            v_diff_sum += (top - bottom).abs() as f64 / 255.0;
            v_count += 1;
        }
    }

    let horizontal_symmetry = if h_count > 0 {
        (1.0 - (h_diff_sum / h_count as f64)).clamp(0.0, 1.0) as f32
    } else {
        1.0
    };

    let vertical_symmetry = if v_count > 0 {
        (1.0 - (v_diff_sum / v_count as f64)).clamp(0.0, 1.0) as f32
    } else {
        1.0
    };

    let cx = (width as f32 - 1.0) / 2.0;
    let cy = (height as f32 - 1.0) / 2.0;
    let max_dist = (cx * cx + cy * cy).sqrt().max(1.0);

    let mut weighted_sum = 0.0f64;
    let mut weight_total = 0.0f64;

    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let dist = (dx * dx + dy * dy).sqrt();
            let weight = (1.0 - (dist / max_dist)).max(0.0) as f64;
            let value = (luminance(frame, x, y) / 255.0) as f64;

            weighted_sum += value * weight;
            weight_total += weight;
        }
    }

    let center_weighted_intensity = if weight_total > 0.0 {
        (weighted_sum / weight_total).clamp(0.0, 1.0) as f32
    } else {
        0.0
    };

    GeometricMetrics {
        horizontal_symmetry,
        vertical_symmetry,
        center_weighted_intensity,
    }
}
