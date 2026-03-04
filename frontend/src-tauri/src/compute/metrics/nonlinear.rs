use crate::compute::buffer::{FrameBuffer, PixelFormat};
use crate::compute::types::NonlinearMetrics;

const DEFAULT_FRACTAL_DIMENSION: f32 = 1.0;
const DEFAULT_HURST_EXPONENT: f32 = 0.5;
const DEFAULT_LYAPUNOV_EXPONENT: f32 = 0.0;
const DEFAULT_CORRELATION_DIMENSION: f32 = 2.0;
const DEFAULT_DFA_ALPHA: f32 = 1.0;
const DEFAULT_SAMPLE_ENTROPY: f32 = 0.0;

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

fn grayscale_series(frame: &FrameBuffer) -> Vec<f32> {
    let width = frame.width as usize;
    let height = frame.height as usize;
    let mut out = Vec::with_capacity(width * height);
    for y in 0..height {
        for x in 0..width {
            out.push(luminance(frame, x, y));
        }
    }
    out
}

fn normalize(series: &[f32]) -> Vec<f32> {
    if series.is_empty() {
        return vec![];
    }
    let mean = series.iter().map(|v| *v as f64).sum::<f64>() / series.len() as f64;
    let var = series
        .iter()
        .map(|v| {
            let d = *v as f64 - mean;
            d * d
        })
        .sum::<f64>()
        / series.len() as f64;
    let std = var.sqrt();
    if std <= f64::EPSILON {
        return vec![0.0; series.len()];
    }
    series
        .iter()
        .map(|v| ((*v as f64 - mean) / std) as f32)
        .collect()
}

fn box_counting_dimension(frame: &FrameBuffer, gray: &[f32]) -> f32 {
    let width = frame.width as usize;
    let height = frame.height as usize;
    if width < 4 || height < 4 || gray.is_empty() {
        return 1.0;
    }

    let threshold = gray.iter().copied().sum::<f32>() / gray.len() as f32;
    let mut binary = vec![0u8; gray.len()];
    for (i, v) in gray.iter().enumerate() {
        binary[i] = u8::from(*v > threshold);
    }

    let mut sizes = Vec::new();
    let mut counts = Vec::new();

    let mut box_size = ((width.min(height)) / 2).max(2);
    while box_size >= 2 {
        let mut count = 0usize;
        let mut y = 0;
        while y < height {
            let mut x = 0;
            while x < width {
                let y_end = (y + box_size).min(height);
                let x_end = (x + box_size).min(width);
                let mut any_on = false;
                'outer: for yy in y..y_end {
                    for xx in x..x_end {
                        if binary[yy * width + xx] == 1 {
                            any_on = true;
                            break 'outer;
                        }
                    }
                }
                if any_on {
                    count += 1;
                }
                x += box_size;
            }
            y += box_size;
        }

        if count > 0 {
            sizes.push((box_size as f64).ln());
            counts.push((count as f64).ln());
        }

        box_size /= 2;
    }

    if sizes.len() < 2 {
        return 1.0;
    }

    let n = sizes.len() as f64;
    let sum_x = sizes.iter().sum::<f64>();
    let sum_y = counts.iter().sum::<f64>();
    let sum_xy = sizes.iter().zip(&counts).map(|(x, y)| x * y).sum::<f64>();
    let sum_xx = sizes.iter().map(|x| x * x).sum::<f64>();
    let denom = (n * sum_xx) - (sum_x * sum_x);
    if denom.abs() < f64::EPSILON {
        return 1.0;
    }
    let slope = ((n * sum_xy) - (sum_x * sum_y)) / denom;
    (-slope as f32).clamp(1.0, 2.0)
}

fn hurst_exponent(series: &[f32]) -> f32 {
    let n = series.len();
    if n < 20 {
        return 0.5;
    }

    let mut scales = Vec::new();
    let mut rs_values = Vec::new();

    let max_k = (n / 4).min(100);
    let mut k = 10;
    while k <= max_k {
        let mut rs_chunks = Vec::new();
        let mut start = 0;
        while start + k <= n {
            let seg = &series[start..start + k];
            let mean = seg.iter().copied().sum::<f32>() / k as f32;
            let std = (seg
                .iter()
                .map(|v| {
                    let d = *v - mean;
                    d * d
                })
                .sum::<f32>()
                / k as f32)
                .sqrt();
            if std > f32::EPSILON {
                let mut c = 0.0f32;
                let mut min_c = f32::MAX;
                let mut max_c = f32::MIN;
                for v in seg {
                    c += *v - mean;
                    min_c = min_c.min(c);
                    max_c = max_c.max(c);
                }
                rs_chunks.push((max_c - min_c) / std);
            }
            start += k;
        }

        if !rs_chunks.is_empty() {
            scales.push((k as f64).ln());
            rs_values.push((rs_chunks.iter().copied().sum::<f32>() / rs_chunks.len() as f32) as f64);
        }

        k += 10;
    }

    if scales.len() < 2 {
        return 0.5;
    }

    let log_rs: Vec<f64> = rs_values.iter().map(|v| v.max(1e-6).ln()).collect();
    let n = scales.len() as f64;
    let sum_x = scales.iter().sum::<f64>();
    let sum_y = log_rs.iter().sum::<f64>();
    let sum_xy = scales.iter().zip(&log_rs).map(|(x, y)| x * y).sum::<f64>();
    let sum_xx = scales.iter().map(|x| x * x).sum::<f64>();
    let denom = (n * sum_xx) - (sum_x * sum_x);
    if denom.abs() < f64::EPSILON {
        return 0.5;
    }
    let slope = ((n * sum_xy) - (sum_x * sum_y)) / denom;
    (slope as f32).clamp(0.0, 1.0)
}

fn dfa_alpha(series: &[f32]) -> f32 {
    let n = series.len();
    if n < 100 {
        return 1.0;
    }

    let mean = series.iter().copied().sum::<f32>() / n as f32;
    let mut integrated = Vec::with_capacity(n);
    let mut acc = 0.0f32;
    for v in series {
        acc += *v - mean;
        integrated.push(acc);
    }

    let mut log_scales = Vec::new();
    let mut log_fluct = Vec::new();

    for &scale in &[16usize, 32, 64, 128, 256] {
        if scale >= n / 4 {
            continue;
        }
        let segments = n / scale;
        if segments < 4 {
            continue;
        }

        let mut f_sum = 0.0f64;
        for seg in 0..segments {
            let start = seg * scale;
            let window = &integrated[start..start + scale];
            let x_mean = (scale - 1) as f64 / 2.0;
            let y_mean = window.iter().map(|v| *v as f64).sum::<f64>() / scale as f64;

            let mut num = 0.0;
            let mut den = 0.0;
            for (i, y) in window.iter().enumerate() {
                let dx = i as f64 - x_mean;
                num += dx * (*y as f64 - y_mean);
                den += dx * dx;
            }
            let slope = if den > 0.0 { num / den } else { 0.0 };
            let intercept = y_mean - slope * x_mean;

            let mse = window
                .iter()
                .enumerate()
                .map(|(i, y)| {
                    let trend = slope * i as f64 + intercept;
                    let d = *y as f64 - trend;
                    d * d
                })
                .sum::<f64>()
                / scale as f64;
            f_sum += mse;
        }

        let fluct = (f_sum / segments as f64).sqrt();
        if fluct > 0.0 {
            log_scales.push((scale as f64).ln());
            log_fluct.push(fluct.ln());
        }
    }

    if log_scales.len() < 2 {
        return 1.0;
    }

    let n = log_scales.len() as f64;
    let sum_x = log_scales.iter().sum::<f64>();
    let sum_y = log_fluct.iter().sum::<f64>();
    let sum_xy = log_scales
        .iter()
        .zip(&log_fluct)
        .map(|(x, y)| x * y)
        .sum::<f64>();
    let sum_xx = log_scales.iter().map(|x| x * x).sum::<f64>();
    let denom = (n * sum_xx) - (sum_x * sum_x);
    if denom.abs() < f64::EPSILON {
        return 1.0;
    }
    let slope = ((n * sum_xy) - (sum_x * sum_y)) / denom;
    (slope as f32).clamp(0.0, 2.0)
}

fn sample_entropy(series: &[f32], m: usize, r_frac: f32) -> f32 {
    if series.len() < m + 2 {
        return 0.0;
    }
    let mean = series.iter().copied().sum::<f32>() / series.len() as f32;
    let std = (series
        .iter()
        .map(|v| {
            let d = *v - mean;
            d * d
        })
        .sum::<f32>()
        / series.len() as f32)
        .sqrt();
    if std <= f32::EPSILON {
        return 0.0;
    }
    let tol = r_frac * std;

    let count_matches = |len: usize| -> usize {
        let mut count = 0usize;
        for i in 0..(series.len() - len) {
            for j in (i + 1)..(series.len() - len) {
                let mut max_dist = 0.0f32;
                for k in 0..len {
                    max_dist = max_dist.max((series[i + k] - series[j + k]).abs());
                }
                if max_dist < tol {
                    count += 1;
                }
            }
        }
        count
    };

    let a = count_matches(m);
    let b = count_matches(m + 1);

    if a == 0 || b == 0 {
        return 0.0;
    }

    -((b as f64) / (a as f64)).ln() as f32
}

fn correlation_dimension(series: &[f32]) -> f32 {
    if series.len() < 120 {
        return 2.0;
    }

    let sample = series.iter().step_by((series.len() / 200).max(1)).copied().collect::<Vec<_>>();
    if sample.len() < 20 {
        return 2.0;
    }

    let mut dists = Vec::new();
    for i in 0..sample.len() {
        for j in (i + 1)..sample.len() {
            dists.push((sample[i] - sample[j]).abs() as f64);
        }
    }
    if dists.len() < 10 {
        return 2.0;
    }
    dists.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let quantile = |q: f64| -> f64 {
        let idx = ((dists.len() as f64 - 1.0) * q).round() as usize;
        dists[idx].max(1e-6)
    };

    let mut xs = Vec::new();
    let mut ys = Vec::new();
    for q in [0.2, 0.35, 0.5, 0.65, 0.8] {
        let r = quantile(q);
        let c = dists.iter().filter(|d| **d < r).count() as f64 / dists.len() as f64;
        if c > 0.0 {
            xs.push(r.ln());
            ys.push(c.ln());
        }
    }

    if xs.len() < 2 {
        return 2.0;
    }

    let n = xs.len() as f64;
    let sum_x = xs.iter().sum::<f64>();
    let sum_y = ys.iter().sum::<f64>();
    let sum_xy = xs.iter().zip(&ys).map(|(x, y)| x * y).sum::<f64>();
    let sum_xx = xs.iter().map(|x| x * x).sum::<f64>();
    let denom = (n * sum_xx) - (sum_x * sum_x);
    if denom.abs() < f64::EPSILON {
        return 2.0;
    }

    let slope = ((n * sum_xy) - (sum_x * sum_y)) / denom;
    (slope as f32).clamp(1.0, 10.0)
}

fn lyapunov_exponent(series: &[f32]) -> f32 {
    if series.len() < 60 {
        return DEFAULT_LYAPUNOV_EXPONENT;
    }

    let mut growth = Vec::new();
    for window in series.windows(3) {
        let d1 = (window[1] - window[0]).abs() as f64;
        let d2 = (window[2] - window[1]).abs() as f64;
        if d1 > 1e-6 && d2 > 1e-6 {
            growth.push((d2 / d1).ln());
        }
    }

    if growth.is_empty() {
        return DEFAULT_LYAPUNOV_EXPONENT;
    }

    (growth.iter().sum::<f64>() / growth.len() as f64) as f32
}

fn finite_in_range_or(value: f32, min: f32, max: f32, default: f32) -> f32 {
    if value.is_finite() {
        value.clamp(min, max)
    } else {
        default.clamp(min, max)
    }
}

fn default_metrics() -> NonlinearMetrics {
    NonlinearMetrics {
        fractal_dimension: DEFAULT_FRACTAL_DIMENSION,
        hurst_exponent: DEFAULT_HURST_EXPONENT,
        lyapunov_exponent: DEFAULT_LYAPUNOV_EXPONENT,
        correlation_dimension: DEFAULT_CORRELATION_DIMENSION,
        dfa_alpha: DEFAULT_DFA_ALPHA,
        sample_entropy: DEFAULT_SAMPLE_ENTROPY,
    }
}

pub fn compute(frame: &FrameBuffer) -> NonlinearMetrics {
    if frame.bytes.is_empty() || frame.pixel_count() == 0 {
        return default_metrics();
    }

    let gray = grayscale_series(frame);
    if gray.len() < 16 {
        return default_metrics();
    }

    let series = normalize(&gray);
    if series.len() < 16 {
        return default_metrics();
    }

    NonlinearMetrics {
        fractal_dimension: finite_in_range_or(
            box_counting_dimension(frame, &gray),
            1.0,
            2.0,
            DEFAULT_FRACTAL_DIMENSION,
        ),
        hurst_exponent: finite_in_range_or(
            hurst_exponent(&series),
            0.0,
            1.0,
            DEFAULT_HURST_EXPONENT,
        ),
        lyapunov_exponent: finite_in_range_or(
            lyapunov_exponent(&series),
            -5.0,
            5.0,
            DEFAULT_LYAPUNOV_EXPONENT,
        ),
        correlation_dimension: finite_in_range_or(
            correlation_dimension(&series),
            1.0,
            10.0,
            DEFAULT_CORRELATION_DIMENSION,
        ),
        dfa_alpha: finite_in_range_or(dfa_alpha(&series), 0.0, 2.0, DEFAULT_DFA_ALPHA),
        sample_entropy: finite_in_range_or(
            sample_entropy(&series, 2, 0.2),
            0.0,
            5.0,
            DEFAULT_SAMPLE_ENTROPY,
        ),
    }
}
