use crate::compute::buffer::{FrameBuffer, PixelFormat};
use crate::compute::types::BasicMetrics;

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

pub fn compute(frame: &FrameBuffer) -> BasicMetrics {
    if frame.bytes.is_empty() || frame.pixel_count() == 0 {
        return BasicMetrics {
            intensity_mean: 0.0,
            intensity_std_dev: 0.0,
            dynamic_range: 0.0,
        };
    }

    let width = frame.width as usize;
    let height = frame.height as usize;

    let mut sum = 0.0f64;
    let mut min_v = f32::MAX;
    let mut max_v = f32::MIN;

    for y in 0..height {
        for x in 0..width {
            let value = luminance(frame, x, y);
            sum += value as f64;
            if value < min_v {
                min_v = value;
            }
            if value > max_v {
                max_v = value;
            }
        }
    }

    let count = frame.pixel_count() as f64;
    let mean = (sum / count) as f32;

    let mut variance_sum = 0.0f64;
    for y in 0..height {
        for x in 0..width {
            let delta = luminance(frame, x, y) - mean;
            variance_sum += (delta * delta) as f64;
        }
    }

    let std_dev = (variance_sum / count).sqrt() as f32;

    BasicMetrics {
        intensity_mean: mean / 255.0,
        intensity_std_dev: std_dev / 255.0,
        dynamic_range: ((max_v - min_v) / 255.0).clamp(0.0, 1.0),
    }
}
