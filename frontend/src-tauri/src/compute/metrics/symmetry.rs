use crate::compute::buffer::{FrameBuffer, PixelFormat};
use crate::compute::types::AdvancedSymmetryMetrics;

fn rgb(frame: &FrameBuffer, x: usize, y: usize) -> (f32, f32, f32) {
    let width = frame.width as usize;
    let channels = frame.format.channels();
    let idx = (y * width + x) * channels;

    match frame.format {
        PixelFormat::Gray8 => {
            let v = frame.bytes.get(idx).copied().unwrap_or(0) as f32;
            (v, v, v)
        }
        PixelFormat::Rgb8 | PixelFormat::Rgba8 => {
            let r = frame.bytes.get(idx).copied().unwrap_or(0) as f32;
            let g = frame.bytes.get(idx + 1).copied().unwrap_or(0) as f32;
            let b = frame.bytes.get(idx + 2).copied().unwrap_or(0) as f32;
            (r, g, b)
        }
    }
}

fn luminance(frame: &FrameBuffer, x: usize, y: usize) -> f32 {
    let (r, g, b) = rgb(frame, x, y);
    (0.2126 * r) + (0.7152 * g) + (0.0722 * b)
}

fn pearson_corr(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let n = a.len() as f64;
    let mean_a = a.iter().map(|v| *v as f64).sum::<f64>() / n;
    let mean_b = b.iter().map(|v| *v as f64).sum::<f64>() / n;

    let mut num = 0.0f64;
    let mut den_a = 0.0f64;
    let mut den_b = 0.0f64;

    for (va, vb) in a.iter().zip(b) {
        let da = *va as f64 - mean_a;
        let db = *vb as f64 - mean_b;
        num += da * db;
        den_a += da * da;
        den_b += db * db;
    }

    if den_a <= f64::EPSILON || den_b <= f64::EPSILON {
        return 0.0;
    }

    (num / (den_a.sqrt() * den_b.sqrt())) as f32
}

fn histogram(values: &[f32], bins: usize, max: f32) -> Vec<f32> {
    let mut hist = vec![0f32; bins];
    if values.is_empty() || bins == 0 || max <= 0.0 {
        return hist;
    }

    for value in values {
        let norm = (*value / max).clamp(0.0, 1.0 - f32::EPSILON);
        let idx = (norm * bins as f32) as usize;
        hist[idx] += 1.0;
    }

    let total = values.len() as f32;
    if total > 0.0 {
        for h in &mut hist {
            *h /= total;
        }
    }
    hist
}

fn rgb_to_hue_bin(r: f32, g: f32, b: f32, bins: usize) -> usize {
    let rf = r / 255.0;
    let gf = g / 255.0;
    let bf = b / 255.0;
    let max = rf.max(gf).max(bf);
    let min = rf.min(gf).min(bf);
    let delta = max - min;

    if delta <= f32::EPSILON {
        return 0;
    }

    let mut hue = if (max - rf).abs() < f32::EPSILON {
        60.0 * (((gf - bf) / delta) % 6.0)
    } else if (max - gf).abs() < f32::EPSILON {
        60.0 * (((bf - rf) / delta) + 2.0)
    } else {
        60.0 * (((rf - gf) / delta) + 4.0)
    };

    if hue < 0.0 {
        hue += 360.0;
    }

    ((hue / 360.0) * bins as f32).floor() as usize % bins
}

pub fn compute(frame: &FrameBuffer) -> AdvancedSymmetryMetrics {
    let width = frame.width as usize;
    let height = frame.height as usize;

    if width < 2 || height < 2 || frame.bytes.is_empty() {
        return AdvancedSymmetryMetrics {
            body_symmetry: 0.0,
            ssim_symmetry: 0.0,
            correlation_symmetry: 0.0,
            histogram_symmetry: 0.0,
            color_symmetry: 0.0,
            pixel_symmetry: 0.0,
            contour_balance: 0.0,
            midline_x: 0,
        };
    }

    let midline_x = (width / 2) as u32;
    let half_w = width / 2;

    let mut left_gray = Vec::with_capacity(height * half_w);
    let mut right_gray = Vec::with_capacity(height * half_w);
    let mut left_hues = Vec::with_capacity(height * half_w);
    let mut right_hues = Vec::with_capacity(height * half_w);

    for y in 0..height {
        for x in 0..half_w {
            let lx = x;
            let rx = width - 1 - x;

            let l = luminance(frame, lx, y);
            let r = luminance(frame, rx, y);
            left_gray.push(l);
            right_gray.push(r);

            let (lr, lg, lb) = rgb(frame, lx, y);
            let (rr, rg, rb) = rgb(frame, rx, y);
            left_hues.push(rgb_to_hue_bin(lr, lg, lb, 36) as f32);
            right_hues.push(rgb_to_hue_bin(rr, rg, rb, 36) as f32);
        }
    }

    let mse = left_gray
        .iter()
        .zip(&right_gray)
        .map(|(l, r)| {
            let d = *l as f64 - *r as f64;
            d * d
        })
        .sum::<f64>()
        / left_gray.len().max(1) as f64;
    let pixel_symmetry = (1.0 - (mse / (255.0 * 255.0))).clamp(0.0, 1.0) as f32;

    let correlation = pearson_corr(&left_gray, &right_gray);
    let correlation_symmetry = ((correlation + 1.0) / 2.0).clamp(0.0, 1.0);

    let h_left = histogram(&left_gray, 256, 255.0);
    let h_right = histogram(&right_gray, 256, 255.0);
    let hist_corr = pearson_corr(&h_left, &h_right);
    let histogram_symmetry = ((hist_corr + 1.0) / 2.0).clamp(0.0, 1.0);

    let hue_left = histogram(&left_hues, 36, 35.0);
    let hue_right = histogram(&right_hues, 36, 35.0);
    let hue_corr = pearson_corr(&hue_left, &hue_right);
    let color_symmetry = ((hue_corr + 1.0) / 2.0).clamp(0.0, 1.0);

    // global SSIM approximation
    let mean_l = left_gray.iter().copied().sum::<f32>() / left_gray.len().max(1) as f32;
    let mean_r = right_gray.iter().copied().sum::<f32>() / right_gray.len().max(1) as f32;
    let var_l = left_gray
        .iter()
        .map(|v| {
            let d = *v - mean_l;
            d * d
        })
        .sum::<f32>()
        / left_gray.len().max(1) as f32;
    let var_r = right_gray
        .iter()
        .map(|v| {
            let d = *v - mean_r;
            d * d
        })
        .sum::<f32>()
        / right_gray.len().max(1) as f32;
    let cov = left_gray
        .iter()
        .zip(&right_gray)
        .map(|(l, r)| (*l - mean_l) * (*r - mean_r))
        .sum::<f32>()
        / left_gray.len().max(1) as f32;
    let c1 = 6.5025f32;
    let c2 = 58.5225f32;
    let ssim_raw = ((2.0 * mean_l * mean_r + c1) * (2.0 * cov + c2))
        / ((mean_l * mean_l + mean_r * mean_r + c1) * (var_l + var_r + c2)).max(1e-6);
    let ssim_symmetry = ((ssim_raw + 1.0) / 2.0).clamp(0.0, 1.0);

    let left_active = left_gray.iter().filter(|v| **v > mean_l).count() as f32;
    let right_active = right_gray.iter().filter(|v| **v > mean_r).count() as f32;
    let total_active = left_active + right_active;
    let contour_balance = if total_active <= f32::EPSILON {
        1.0
    } else {
        (1.0 - (left_active - right_active).abs() / total_active).clamp(0.0, 1.0)
    };

    let body_symmetry = (0.35 * ssim_symmetry)
        + (0.25 * correlation_symmetry)
        + (0.20 * histogram_symmetry)
        + (0.20 * pixel_symmetry);

    AdvancedSymmetryMetrics {
        body_symmetry: body_symmetry.clamp(0.0, 1.0),
        ssim_symmetry,
        correlation_symmetry,
        histogram_symmetry,
        color_symmetry,
        pixel_symmetry,
        contour_balance,
        midline_x,
    }
}
