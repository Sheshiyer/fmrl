# Camera Calibration System — Design Specification

**GAP-013 · Issue #273**
**Status:** Draft
**Author:** Architect Agent
**Date:** 2026-01-10

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Fundamental Constraints](#2-fundamental-constraints)
3. [Calibration Workflow](#3-calibration-workflow)
4. [Per-Camera Profiles](#4-per-camera-profiles)
5. [Runtime Correction Pipeline](#5-runtime-correction-pipeline)
6. [TypeScript Interfaces](#6-typescript-interfaces)
7. [Hook API — useCalibration](#7-hook-api--usecalibration)
8. [Rust Compute Integration](#8-rust-compute-integration)
9. [Supabase Schema](#9-supabase-schema)
10. [Recalibration Triggers](#10-recalibration-triggers)
11. [Implementation Plan](#11-implementation-plan)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. Problem Statement

The Biofield Mirror metrics pipeline (`MetricsCalculator`, `ScoreCalculator`, Rust `compute`) operates on raw pixel values from the camera feed. Every metric — intensity, symmetry, color entropy, LQD — depends directly on those pixel values. This creates a **reproducibility problem**:

| Variable | Impact on Metrics |
|---|---|
| Camera white balance | Shifts `dominantHue`, `saturationMean`, `colorEntropy`, all color-based scores |
| Sensor exposure | Shifts `avgIntensity`, `lightQuantaDensity`, `normalizedArea`, `innerNoise` |
| Ambient light level | Scales all intensity-derived metrics proportionally |
| Sensor noise floor | Inflates `innerNoise`, `innerNoisePercent`, `frameToFrameChange` |
| Lens vignetting | Biases symmetry metrics toward center, distorts zone-based analysis |

**Result:** The same person, same biofield state, measured under two different lighting conditions or cameras, gets materially different scores. Users cannot compare sessions across environments, and baselines (`biofield_baselines`) become invalid when conditions change.

**Goal:** Normalize camera input so that metrics reflect the biofield signal, not the camera/environment characteristics. A neutral gray surface should produce the same pixel values (within ±2%) regardless of camera or lighting.

---

## 2. Fundamental Constraints

These constraints are physics-based and non-negotiable. They determine the architecture.

### 2.1 Real-Time Budget

The current pipeline samples frames every **500ms** via `useRealTimeMetrics`. The `MetricsCalculator` processes a 640×480 frame in ~5-15ms. Our calibration correction budget:

- **Hard limit:** ≤2ms per frame at 640×480 (307,200 pixels)
- **Target:** ≤1ms to leave headroom for future resolution increases
- **Operation count:** 307,200 pixels × 3 channels = 921,600 multiply-clamp operations
- **Feasibility:** Simple per-pixel multiply is ~0.3ms on modern hardware — well within budget

### 2.2 Correction Must Be Reversible

The corrected ImageData goes to MetricsCalculator, but the **original** frame is what gets captured for artifacts (`biofield_artifacts`). Users and researchers need access to raw data. Calibration is a processing layer, not a destructive transform.

### 2.3 Profile Validity Is Bounded

Camera sensors drift with temperature. Ambient light changes throughout the day. A calibration profile has a **finite validity window** (default: 24 hours). Beyond that, correction coefficients may introduce more error than they remove.

### 2.4 Calibration Cannot Require Specialized Equipment

Users are ordinary people, not lab technicians. The reference target must be something commonly available — a white wall, a sheet of paper, or a neutral surface. Precision degrades accordingly, but accessibility wins.

---

## 3. Calibration Workflow

### 3.1 User Flow

```
┌──────────────────────────────────────────────────────────┐
│ Settings → Camera → "Calibrate Camera"                   │
│                                                          │
│ Step 1: SELECT REFERENCE                                 │
│ ┌──────────────────────────────────────────────────┐     │
│ │ Choose a calibration reference:                   │     │
│ │  ○ White wall / white paper (recommended)         │     │
│ │  ○ 18% gray card (advanced)                       │     │
│ │  ○ Use previous calibration as reference          │     │
│ └──────────────────────────────────────────────────┘     │
│                                                          │
│ Step 2: POSITION REFERENCE                               │
│ ┌──────────────────────────────────────────────────┐     │
│ │ [Live camera preview with guide overlay]          │     │
│ │                                                   │     │
│ │ Fill the frame with your reference surface.       │     │
│ │ Ensure even lighting — no shadows or glare.       │     │
│ │                                                   │     │
│ │ Coverage: ████████░░ 82%  (need 70%+)             │     │
│ │ Uniformity: ✓ Good                                │     │
│ └──────────────────────────────────────────────────┘     │
│                                                          │
│ Step 3: CAPTURE REFERENCE                                │
│  [ Capturing... 30 frames over 1 second ]                │
│  ████████████████████░░░░ 20/30 frames                   │
│                                                          │
│ Step 4: REVIEW PROFILE                                   │
│ ┌──────────────────────────────────────────────────┐     │
│ │ Calibration Profile                               │     │
│ │ Camera: FaceTime HD (Built-in)                    │     │
│ │ White Balance: R×1.04  G×1.00  B×0.97             │     │
│ │ Exposure Offset: +0.12 EV                         │     │
│ │ Ambient Light: 340 lux (indoor moderate)          │     │
│ │ Noise Floor: 2.3%                                 │     │
│ │ Quality: ★★★★☆ (Good)                             │     │
│ │                                                   │     │
│ │ [Apply & Save]  [Recapture]  [Cancel]             │     │
│ └──────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Reference Frame Capture Algorithm

```
CALIBRATION_CAPTURE(videoElement, referenceType):
  frames = []
  FOR i = 0 TO 29:
    canvas.drawImage(videoElement, 0, 0)
    imageData = ctx.getImageData(0, 0, width, height)
    frames.push(imageData)
    AWAIT sleep(33ms)  // ~30fps capture rate

  // Use center 60% crop to avoid edge/vignetting artifacts
  centerRegion = cropCenter(width, height, 0.6)

  // Compute per-channel statistics across all frames in center region
  FOR EACH channel IN [R, G, B]:
    values = extractChannel(frames, channel, centerRegion)
    stats[channel] = {
      mean: mean(values),
      stdDev: stdDev(values),
      histogram: histogram(values, 256 bins),
      p5:  percentile(values, 5),
      p95: percentile(values, 95)
    }

  // Compute luminance statistics (BT.709)
  luminance = 0.2126 * stats.R.mean + 0.7152 * stats.G.mean + 0.0722 * stats.B.mean

  // Frame-to-frame variance (temporal noise floor)
  temporalNoise = mean(frameDifferences(frames)) / 255

  RETURN { stats, luminance, temporalNoise, frameCount: 30, referenceType }
```

### 3.3 Validation Checks

Before accepting a calibration capture:

| Check | Threshold | Rationale |
|---|---|---|
| Center region fill | ≥70% of pixels within ±2σ of mean | Reference must dominate the frame |
| Spatial uniformity | σ/μ < 0.15 per channel in center region | No shadows, glare, or mixed surfaces |
| Temporal stability | Frame-to-frame δ < 3% of mean | Camera must be stable (no motion blur) |
| Dynamic range usage | Mean intensity in [40, 215] range | Not too dark or clipping highlights |
| Channel balance | No channel > 2× another channel's mean | Wildly imbalanced = something wrong |

If any check fails, the UI shows a specific remediation message (e.g., "Too much shadow variation — try moving closer to the light source").

---

## 4. Per-Camera Profiles

### 4.1 Profile Structure

A calibration profile captures everything needed to normalize a specific camera under specific conditions:

```
CalibrationProfile
├── identity
│   ├── id: UUID
│   ├── userId: UUID
│   ├── cameraDeviceId: string        // MediaDevices API deviceId
│   ├── cameraLabel: string           // Human-readable name
│   └── createdAt: ISO 8601
│
├── whiteBalance
│   ├── gainR: number                 // Red channel multiplier (typically 0.8–1.3)
│   ├── gainG: number                 // Green channel multiplier (reference, ~1.0)
│   ├── gainB: number                 // Blue channel multiplier
│   └── referenceGray: number         // Target neutral gray [0–255]
│
├── exposure
│   ├── measuredMeanLuminance: number // Observed mean luminance [0–255]
│   ├── targetMeanLuminance: number   // Desired (default: 128)
│   ├── exposureGain: number          // target / measured, clamped [0.5, 2.5]
│   └── gammaCorrection: number       // Gamma exponent (1.0 = linear)
│
├── noiseFloor
│   ├── temporalNoisePercent: number  // Frame-to-frame variance %
│   └── spatialNoisePercent: number   // Within-frame variance %
│
├── ambientLight
│   ├── estimatedLux: number          // Rough lux from luminance mapping
│   ├── lightingCategory: string      // 'dim' | 'indoor' | 'bright' | 'outdoor'
│   └── colorTemperatureK: number     // Estimated CCT from R/B ratio
│
├── referenceHistogram
│   ├── red: number[256]              // Per-channel histograms
│   ├── green: number[256]
│   └── blue: number[256]
│
└── metadata
    ├── referenceType: string         // 'white' | 'gray18' | 'previous'
    ├── captureResolution: [w, h]
    ├── framesCaptured: number
    ├── qualityScore: number          // 0–100 from validation checks
    ├── validUntil: ISO 8601          // createdAt + validity period
    └── recipeVersion: string         // Schema version for compatibility
```

### 4.2 Correction Coefficient Derivation

```
DERIVE_PROFILE(captureStats, referenceType):

  // 1. White Balance Gains
  IF referenceType == 'white':
    targetGray = 200  // White surface (not 255, avoid clipping)
  ELSE IF referenceType == 'gray18':
    targetGray = 128  // 18% gray card → mid-gray
  ELSE:
    targetGray = captureStats.luminance  // Self-referential

  gainR = targetGray / captureStats.R.mean
  gainG = targetGray / captureStats.G.mean
  gainB = targetGray / captureStats.B.mean

  // Normalize gains relative to green (most accurate sensor)
  maxGain = max(gainR, gainG, gainB)
  IF maxGain > 1.5:
    scale = 1.5 / maxGain
    gainR *= scale;  gainG *= scale;  gainB *= scale

  // 2. Exposure Normalization
  measuredLuminance = captureStats.luminance
  targetLuminance = 128
  exposureGain = clamp(targetLuminance / measuredLuminance, 0.5, 2.5)

  gammaCorrection = 1.0  // Default: trust sRGB

  // 3. Noise Floor
  temporalNoise = captureStats.temporalNoise
  spatialNoise = mean(R.stdDev, G.stdDev, B.stdDev) / captureStats.luminance

  // 4. Ambient Light Estimation (McCamy approximation from R/B ratio)
  ratio = captureStats.R.mean / max(captureStats.B.mean, 1)
  colorTempK =
    ratio > 1.5 ? 2700 :   // Warm / incandescent
    ratio > 1.2 ? 3500 :   // Warm white
    ratio > 0.95 ? 5000 :  // Neutral daylight
    ratio > 0.8 ? 6500 :   // Cool daylight
    7500                     // Blue sky / overcast

  RETURN CalibrationProfile { ... }
```

---

## 5. Runtime Correction Pipeline

### 5.1 Insertion Point

The correction slots between frame capture and metrics calculation. Three paths:

```
PATH A — Canvas-based (useRealTimeMetrics.processFrame):

  ctx.getImageData()             // Raw ImageData from canvas
       │
       ▼
  ┌──────────────────────────┐
  │  applyCalibration()      │  ← NEW: per-pixel correction
  │  ~0.3ms @ 640×480        │
  └──────────────────────────┘
       │
       ▼
  MetricsCalculator              // Receives normalized ImageData
  .calculateFromImageData()


PATH B — Shader-based (useRealTimeMetrics.processFrameData):

  PIP shader output              // Already processed values
       │
       ▼
  ┌──────────────────────────┐
  │  correctShaderValues()   │  ← NEW: adjust brightness + color
  │  using profile gains     │
  └──────────────────────────┘
       │
       ▼
  Temporal buffer + score calc


PATH C — Rust compute (Tauri commands):

  Raw frame bytes                // From camera via IPC
       │
       ▼
  ┌──────────────────────────┐
  │  apply_calibration()     │  ← NEW: Rust-native correction
  │  ~0.1ms @ 640×480        │     (SIMD-friendly loop)
  └──────────────────────────┘
       │
       ▼
  compute_metric_families()      // Receives normalized buffer
```

### 5.2 Per-Pixel Correction — TypeScript

The core correction is three multiplies per pixel. This is the hot path.

```typescript
/**
 * Apply calibration correction to raw ImageData in-place.
 * Mutates the input for zero-allocation performance.
 *
 * Cost: ~0.3ms for 640x480 (921,600 channel operations)
 */
function applyCalibrationInPlace(
  imageData: ImageData,
  combinedR: number,
  combinedG: number,
  combinedB: number
): void {
  const data = imageData.data; // Uint8ClampedArray auto-clamps to [0, 255]

  for (let i = 0; i < data.length; i += 4) {
    data[i]     = data[i]     * combinedR; // R
    data[i + 1] = data[i + 1] * combinedG; // G
    data[i + 2] = data[i + 2] * combinedB; // B
    // data[i + 3] — Alpha unchanged
  }
}
```

**Performance notes:**
- `Uint8ClampedArray` auto-clamps to `[0, 255]`, eliminating explicit `Math.min/Math.max`
- Combined gains pre-multiply white balance × exposure to reduce per-pixel ops from 6 to 3
- Loop on existing array — zero allocation, zero GC pressure
- V8 will auto-vectorize this loop in most cases

### 5.3 Per-Pixel Correction — Rust

For the Tauri compute path:

```rust
/// Apply calibration correction to raw frame bytes in-place.
/// Operates on Rgb8 or Rgba8 format. ~0.1ms for 640x480.
pub fn apply_calibration(
    bytes: &mut [u8],
    format: &PixelFormat,
    gain_r: f32,
    gain_g: f32,
    gain_b: f32,
    exposure_gain: f32,
) {
    let combined_r = gain_r * exposure_gain;
    let combined_g = gain_g * exposure_gain;
    let combined_b = gain_b * exposure_gain;
    let channels = format.channels() as usize;

    for pixel in bytes.chunks_exact_mut(channels) {
        pixel[0] = ((pixel[0] as f32 * combined_r).round() as u16).min(255) as u8;
        pixel[1] = ((pixel[1] as f32 * combined_g).round() as u16).min(255) as u8;
        pixel[2] = ((pixel[2] as f32 * combined_b).round() as u16).min(255) as u8;
        // Alpha (if present) unchanged
    }
}
```

### 5.4 Shader Value Correction

For Path B (pre-computed shader metrics), the correction adjusts values not pixels:

```typescript
/**
 * Correct shader-derived metric values using calibration profile.
 * Symmetry metrics are ratio-based and invariant to uniform gain.
 */
function correctShaderValues(
  values: ShaderMetricValues,
  profile: CalibrationProfile
): ShaderMetricValues {
  return {
    // Brightness scales linearly with exposure correction
    brightness: clamp01(values.brightness * profile.exposure.exposureGain),
    // Color entropy is largely invariant to uniform gain — leave as-is
    colorEntropy: values.colorEntropy,
    // Symmetry: ratio-based, invariant to uniform gain
    horizontalSymmetry: values.horizontalSymmetry,
    verticalSymmetry: values.verticalSymmetry,
    // Saturation shifts with white balance spread
    saturationMean: clamp01(
      values.saturationMean * averageGainMagnitude(profile.whiteBalance)
    ),
  };
}

function averageGainMagnitude(wb: WhiteBalanceCorrection): number {
  return (wb.gainR + wb.gainG + wb.gainB) / 3;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
```

### 5.5 Ambient Light Monitor (Runtime)

Continuously tracks ambient light during sessions to detect drift:

```typescript
class AmbientLightMonitor {
  private readonly WINDOW_SIZE = 60;        // 30 seconds at 500ms
  private readonly CHANGE_THRESHOLD = 0.20; // 20% luminance shift
  private readonly DEBOUNCE_FRAMES = 10;    // Must persist 5 seconds

  private buffer: number[] = [];
  private calibrationLuminance: number;
  private changeFrameCount = 0;

  constructor(calibrationLuminance: number) {
    this.calibrationLuminance = calibrationLuminance;
  }

  update(frameLuminance: number): AmbientLightStatus {
    this.buffer.push(frameLuminance);
    if (this.buffer.length > this.WINDOW_SIZE) this.buffer.shift();
    if (this.buffer.length < 10) return { stable: true, delta: 0 };

    const rollingMean = this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;
    const delta = Math.abs(rollingMean - this.calibrationLuminance) / this.calibrationLuminance;

    if (delta > this.CHANGE_THRESHOLD) {
      this.changeFrameCount++;
      if (this.changeFrameCount >= this.DEBOUNCE_FRAMES) {
        return {
          stable: false,
          delta,
          message: `Lighting changed by ${(delta * 100).toFixed(0)}% — recalibration recommended`,
        };
      }
    } else {
      this.changeFrameCount = 0;
    }

    return { stable: true, delta };
  }
}
```

---

## 6. TypeScript Interfaces

All types to add to `frontend/src/types/index.ts`:

```typescript
// ─────────────────────────────────────────────
// Camera Calibration Types
// ─────────────────────────────────────────────

/** Reference surface type used during calibration capture */
export type CalibrationReferenceType = 'white' | 'gray18' | 'previous';

/** Ambient lighting category derived from luminance estimation */
export type LightingCategory = 'dim' | 'indoor' | 'bright' | 'outdoor';

/** Per-channel white balance correction gains */
export interface WhiteBalanceCorrection {
  gainR: number;    // Red channel gain (typically 0.8–1.3)
  gainG: number;    // Green channel gain (reference channel)
  gainB: number;    // Blue channel gain
  referenceGray: number; // Target neutral gray [0–255]
}

/** Exposure normalization parameters */
export interface ExposureCorrection {
  measuredMeanLuminance: number; // Observed at calibration [0–255]
  targetMeanLuminance: number;   // Desired (default: 128)
  exposureGain: number;          // target / measured, clamped [0.5, 2.5]
  gammaCorrection: number;       // 1.0 = linear / sRGB passthrough
}

/** Sensor noise characteristics */
export interface NoiseFloor {
  temporalNoisePercent: number; // Frame-to-frame variance %
  spatialNoisePercent: number;  // Within-frame variance %
}

/** Ambient lighting conditions */
export interface AmbientLightEstimate {
  estimatedLux: number;
  lightingCategory: LightingCategory;
  colorTemperatureK: number; // Estimated CCT in Kelvin
}

/** Per-channel histogram of the reference frame */
export interface ReferenceHistogram {
  red: number[];   // 256 bins
  green: number[]; // 256 bins
  blue: number[];  // 256 bins
}

/** Calibration profile metadata */
export interface CalibrationMetadata {
  referenceType: CalibrationReferenceType;
  captureResolution: [number, number];
  framesCaptured: number;
  qualityScore: number;       // 0–100
  validUntil: string;         // ISO 8601
  recipeVersion: string;      // Schema version
}

/** Complete calibration profile for a camera + environment */
export interface CalibrationProfile {
  id: string;
  userId: string;
  cameraDeviceId: string;
  cameraLabel: string;
  createdAt: string;

  whiteBalance: WhiteBalanceCorrection;
  exposure: ExposureCorrection;
  noiseFloor: NoiseFloor;
  ambientLight: AmbientLightEstimate;
  referenceHistogram: ReferenceHistogram;
  metadata: CalibrationMetadata;
}

/** Pre-computed runtime correction coefficients */
export interface CalibrationCoefficients {
  combinedR: number; // whiteBalance.gainR * exposure.exposureGain
  combinedG: number;
  combinedB: number;
  baselineLuminance: number;
  isValid: boolean;
}

/** Ambient light monitoring status */
export interface AmbientLightStatus {
  stable: boolean;
  delta: number;     // Fractional change (0.0 = identical)
  message?: string;  // Remediation advice if unstable
}

/** Validation result for a calibration capture */
export interface CalibrationValidation {
  passed: boolean;
  checks: {
    centerFill: { passed: boolean; value: number; threshold: number };
    spatialUniformity: { passed: boolean; value: number; threshold: number };
    temporalStability: { passed: boolean; value: number; threshold: number };
    dynamicRange: { passed: boolean; value: number; range: [number, number] };
    channelBalance: { passed: boolean; value: number; threshold: number };
  };
  remediations: string[];
}

/** Calibration wizard step */
export type CalibrationStep =
  | 'select-reference'
  | 'position-reference'
  | 'capturing'
  | 'validating'
  | 'review'
  | 'complete'
  | 'error';

/** Shader-derived metrics that need calibration adjustment */
export interface ShaderMetricValues {
  brightness: number;
  colorEntropy: number;
  horizontalSymmetry: number;
  verticalSymmetry: number;
  saturationMean: number;
}
```

---

## 7. Hook API — `useCalibration`

### 7.1 Interface

```typescript
export interface UseCalibrationReturn {
  // ── State ──
  profile: CalibrationProfile | null;
  isCalibrated: boolean;
  coefficients: CalibrationCoefficients | null;
  ambientStatus: AmbientLightStatus;
  isCalibrating: boolean;
  calibrationStep: CalibrationStep;

  // ── Correction Functions (hot path) ──
  /** Apply correction to raw ImageData. Returns same ref (mutated in-place). */
  correctFrame: (imageData: ImageData) => ImageData;
  /** Apply correction to shader metric values. Returns new object. */
  correctShaderValues: (values: ShaderMetricValues) => ShaderMetricValues;
  /** Feed frame luminance to ambient monitor. Call every metrics frame. */
  updateAmbientMonitor: (frameLuminance: number) => void;

  // ── Actions ──
  startCalibration: () => void;
  cancelCalibration: () => void;
  clearProfile: () => Promise<void>;
  recalibrate: () => void;
}
```

### 7.2 Integration with `useRealTimeMetrics`

Changes to the existing pipeline are minimal — two lines per path:

```typescript
// In useRealTimeMetrics.ts — processFrame function

// BEFORE (current):
const imageData = ctx.getImageData(0, 0, width, height);
const metrics = metricsCalculator.calculateFromImageData(imageData, mask);

// AFTER (with calibration):
const rawImageData = ctx.getImageData(0, 0, width, height);
const imageData = calibration.correctFrame(rawImageData);
const metrics = metricsCalculator.calculateFromImageData(imageData, mask);
calibration.updateAmbientMonitor(metrics.avgIntensity);
```

### 7.3 Dual Storage Strategy

Profiles stored in two locations for offline resilience:

1. **Supabase** — Canonical store, synced across devices
2. **IndexedDB** — Local cache for offline use and instant load on startup

```typescript
const CALIBRATION_DB = 'biofield-calibration';
const STORE_NAME = 'profiles';

async function saveProfileLocally(profile: CalibrationProfile): Promise<void> {
  const db = await openDB(CALIBRATION_DB, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    },
  });
  await db.put(STORE_NAME, profile);
}

async function loadProfileForCamera(
  deviceId: string
): Promise<CalibrationProfile | null> {
  const db = await openDB(CALIBRATION_DB, 1);
  const all = await db.getAll(STORE_NAME);
  return (
    all
      .filter((p) => p.cameraDeviceId === deviceId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0] ?? null
  );
}
```

### 7.4 Hook Implementation Skeleton

```typescript
export function useCalibration(
  cameraDeviceId: string | null
): UseCalibrationReturn {
  const [profile, setProfile] = useState<CalibrationProfile | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] =
    useState<CalibrationStep>('select-reference');
  const [ambientStatus, setAmbientStatus] = useState<AmbientLightStatus>({
    stable: true,
    delta: 0,
  });
  const ambientMonitorRef = useRef<AmbientLightMonitor | null>(null);

  // Load profile when camera changes
  useEffect(() => {
    if (!cameraDeviceId) return;
    loadProfileForCamera(cameraDeviceId).then((cached) => {
      if (cached && new Date(cached.metadata.validUntil) > new Date()) {
        setProfile(cached);
      } else {
        setProfile(null);
      }
    });
  }, [cameraDeviceId]);

  // Pre-compute coefficients from profile
  const coefficients = useMemo<CalibrationCoefficients | null>(() => {
    if (!profile) return null;
    const isValid = new Date(profile.metadata.validUntil) > new Date();
    return {
      combinedR: profile.whiteBalance.gainR * profile.exposure.exposureGain,
      combinedG: profile.whiteBalance.gainG * profile.exposure.exposureGain,
      combinedB: profile.whiteBalance.gainB * profile.exposure.exposureGain,
      baselineLuminance: profile.exposure.measuredMeanLuminance,
      isValid,
    };
  }, [profile]);

  // Initialize ambient monitor
  useEffect(() => {
    if (coefficients) {
      ambientMonitorRef.current = new AmbientLightMonitor(
        coefficients.baselineLuminance
      );
    } else {
      ambientMonitorRef.current = null;
    }
  }, [coefficients]);

  // Stable correction function — identity when uncalibrated
  const correctFrame = useCallback(
    (imageData: ImageData): ImageData => {
      if (!coefficients?.isValid) return imageData;
      applyCalibrationInPlace(
        imageData,
        coefficients.combinedR,
        coefficients.combinedG,
        coefficients.combinedB
      );
      return imageData;
    },
    [coefficients]
  );

  const correctShaderValsFn = useCallback(
    (values: ShaderMetricValues): ShaderMetricValues => {
      if (!coefficients?.isValid || !profile) return values;
      return correctShaderValues(values, profile);
    },
    [coefficients, profile]
  );

  const updateAmbientMonitor = useCallback((frameLuminance: number) => {
    const monitor = ambientMonitorRef.current;
    if (monitor) setAmbientStatus(monitor.update(frameLuminance));
  }, []);

  return {
    profile,
    isCalibrated: !!coefficients?.isValid,
    coefficients,
    ambientStatus,
    isCalibrating,
    calibrationStep,
    correctFrame,
    correctShaderValues: correctShaderValsFn,
    updateAmbientMonitor,
    startCalibration: () => setIsCalibrating(true),
    cancelCalibration: () => {
      setIsCalibrating(false);
      setCalibrationStep('select-reference');
    },
    clearProfile: async () => {
      /* delete from IDB + Supabase */
      setProfile(null);
    },
    recalibrate: () => {
      setProfile(null);
      setIsCalibrating(true);
    },
  };
}
```

---

## 8. Rust Compute Integration

### 8.1 New Types (`compute/types.rs`)

```rust
/// Camera calibration coefficients for the Rust compute path.
/// Pre-computed on the TypeScript side and passed via Tauri command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationCoefficients {
    pub combined_r: f32,
    pub combined_g: f32,
    pub combined_b: f32,
}
```

### 8.2 Extended ComputeInput

Add an optional calibration field:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputeInput {
    pub width: u32,
    pub height: u32,
    pub format: PixelFormat,
    pub bytes: Vec<u8>,
    pub frame_id: Option<u64>,
    pub timestamp_ms: Option<f64>,
    pub calibration: Option<CalibrationCoefficients>, // ← NEW
}
```

### 8.3 Pipeline Integration (`compute/mod.rs`)

```rust
pub fn run_compute_metrics(mut input: ComputeInput) -> ComputeOutput {
    // Apply calibration BEFORE metric computation
    if let Some(ref cal) = input.calibration {
        apply_calibration(
            &mut input.bytes,
            &input.format,
            cal.combined_r,
            cal.combined_g,
            cal.combined_b,
            1.0, // exposure already baked into combined gains
        );
    }

    // ... existing pipeline continues unchanged
    match FrameBuffer::try_new(
        input.width, input.height, input.format.clone(), input.bytes
    ) {
        // ...
    }
}
```

---

## 9. Supabase Schema

### 9.1 Migration: Table Definition

Follows existing `biofield_*` conventions: uuid PKs, user_id FK cascade, `created_at`/`updated_at`, check constraints.

```sql
-- Migration: camera_calibration_profiles
-- Pattern follows biofield_foundation.sql conventions

begin;

create table if not exists public.camera_calibration_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null
                        references public.users(id) on delete cascade,

  -- Camera identity
  camera_device_id    text not null,
  camera_label        text not null default '',

  -- White balance correction
  wb_gain_r           real not null default 1.0,
  wb_gain_g           real not null default 1.0,
  wb_gain_b           real not null default 1.0,
  wb_reference_gray   smallint not null default 128,

  -- Exposure correction
  measured_luminance  real not null,
  target_luminance    real not null default 128.0,
  exposure_gain       real not null default 1.0,
  gamma_correction    real not null default 1.0,

  -- Noise characteristics
  temporal_noise_pct  real not null default 0.0,
  spatial_noise_pct   real not null default 0.0,

  -- Ambient light estimate
  estimated_lux       real,
  lighting_category   text not null default 'indoor'
    check (lighting_category in ('dim', 'indoor', 'bright', 'outdoor')),
  color_temperature_k real,

  -- Reference histogram (JSON arrays of 256 numbers per channel)
  reference_histogram jsonb not null
    default '{"red":[],"green":[],"blue":[]}',

  -- Metadata
  reference_type      text not null default 'white'
    check (reference_type in ('white', 'gray18', 'previous')),
  capture_resolution  integer[] not null default '{640,480}',
  frames_captured     smallint not null default 30,
  quality_score       smallint not null default 0
    check (quality_score between 0 and 100),
  valid_until         timestamptz not null,
  recipe_version      text not null default '1.0',

  -- Lifecycle
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Fast lookup: user + camera + active
create index if not exists idx_calibration_user_camera
  on public.camera_calibration_profiles (user_id, camera_device_id, is_active)
  where is_active = true;

-- Expiry queries
create index if not exists idx_calibration_valid_until
  on public.camera_calibration_profiles (valid_until)
  where is_active = true;

-- One active profile per user per camera
create unique index if not exists idx_calibration_unique_active
  on public.camera_calibration_profiles (user_id, camera_device_id)
  where is_active = true;

-- Auto-update timestamp trigger
create or replace trigger set_calibration_updated_at
  before update on public.camera_calibration_profiles
  for each row execute function public.set_updated_at();

comment on table public.camera_calibration_profiles is
  'Per-camera calibration profiles normalizing sensor input before biofield metrics.';

commit;
```

### 9.2 RLS Policies

```sql
-- RLS for camera_calibration_profiles
-- Pattern: user owns their profiles (matches biofield_sessions etc.)

begin;

alter table public.camera_calibration_profiles enable row level security;

drop policy if exists "Calibration profiles select own"
  on public.camera_calibration_profiles;
create policy "Calibration profiles select own"
  on public.camera_calibration_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Calibration profiles insert own"
  on public.camera_calibration_profiles;
create policy "Calibration profiles insert own"
  on public.camera_calibration_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Calibration profiles update own"
  on public.camera_calibration_profiles;
create policy "Calibration profiles update own"
  on public.camera_calibration_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Calibration profiles delete own"
  on public.camera_calibration_profiles;
create policy "Calibration profiles delete own"
  on public.camera_calibration_profiles for delete
  to authenticated
  using (auth.uid() = user_id);

commit;
```

### 9.3 Supabase Type Generation

Add to `frontend/src/types/supabase.ts` in the `Tables` interface:

```typescript
camera_calibration_profiles: {
  Row: {
    id: string;
    user_id: string;
    camera_device_id: string;
    camera_label: string;
    wb_gain_r: number;
    wb_gain_g: number;
    wb_gain_b: number;
    wb_reference_gray: number;
    measured_luminance: number;
    target_luminance: number;
    exposure_gain: number;
    gamma_correction: number;
    temporal_noise_pct: number;
    spatial_noise_pct: number;
    estimated_lux: number | null;
    lighting_category: string;
    color_temperature_k: number | null;
    reference_histogram: { red: number[]; green: number[]; blue: number[] };
    reference_type: string;
    capture_resolution: number[];
    frames_captured: number;
    quality_score: number;
    valid_until: string;
    recipe_version: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<Insert>;
};
```

---

## 10. Recalibration Triggers

### 10.1 Trigger Matrix

| Trigger | Detection Method | Action |
|---|---|---|
| **Camera device change** | `cameraDeviceId` differs from profile's | Auto-load profile for new device; prompt if none exists |
| **Ambient light shift** | `AmbientLightMonitor` detects >20% sustained luminance change | Toast notification: "Lighting changed — Recalibrate?" |
| **Profile expiry** | `validUntil < now()` checked on profile load and every 5 min | Banner: "Calibration expired (24h) — Recalibrate for best accuracy" |
| **Manual request** | User clicks "Recalibrate" in Settings | Start calibration wizard immediately |
| **Session start** | Checked at session initialization | If no valid profile: subtle prompt, not blocking |
| **Score anomaly** | Scores jump >30% between frames for 10+ consecutive frames | Suggest recalibration as possible cause |

### 10.2 Notification Priority

Recalibration prompts are **advisory, not blocking**. The system works without calibration — metrics are just less comparable across sessions.

```
Priority Levels:
  HIGH   — Camera changed, no profile exists → modal prompt at session start
  MEDIUM — Profile expired or ambient shift → toast notification
  LOW    — First-time use, no profiles at all → onboarding hint
```

### 10.3 Configurable Parameters

```typescript
export interface CalibrationConfig {
  /** Hours until a profile expires (default: 24) */
  validityPeriodHours: number;
  /** Fractional luminance change to trigger recalibration alert (default: 0.20) */
  ambientChangeThreshold: number;
  /** Seconds of sustained change before alerting (default: 5) */
  ambientDebounceSeconds: number;
  /** Whether to auto-prompt on camera change (default: true) */
  promptOnCameraChange: boolean;
  /** Whether to show calibration in onboarding (default: true) */
  showInOnboarding: boolean;
}

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  validityPeriodHours: 24,
  ambientChangeThreshold: 0.20,
  ambientDebounceSeconds: 5,
  promptOnCameraChange: true,
  showInOnboarding: true,
};
```

---

## 11. Implementation Plan

### Phase 1: Core Calibration (Priority: High)

| Task | Effort | Dependencies | Parallelizable |
|---|---|---|---|
| Add TypeScript interfaces to `types/index.ts` | 1h | None | [P] Yes |
| Implement `CalibrationCapture` service (frame capture + stats) | 4h | Types | No |
| Implement `CalibrationProfileDeriver` (stats → profile) | 3h | Capture service | No |
| Implement `applyCalibrationInPlace()` correction function | 1h | Types | [P] Yes |
| Implement `useCalibration` hook | 4h | All above | No |
| Integrate into `useRealTimeMetrics` (2 lines per path) | 1h | Hook | No |
| Supabase migration (table + RLS) | 1h | None | [P] Yes |
| IndexedDB persistence layer | 2h | Types | [P] Yes |

**Phase 1 Total: ~17h (10h critical path)**

### Phase 2: Calibration Wizard UI

| Task | Effort | Dependencies |
|---|---|---|
| `CalibrationWizard` component (4-step flow) | 6h | Phase 1 |
| Live preview with coverage/uniformity overlay | 4h | Wizard shell |
| Profile review screen with visual summary | 2h | Wizard shell |
| Settings integration (button + status indicator) | 2h | Wizard |

**Phase 2 Total: ~14h**

### Phase 3: Recalibration & Polish

| Task | Effort | Dependencies |
|---|---|---|
| `AmbientLightMonitor` class | 2h | Phase 1 |
| Recalibration trigger system (toast notifications) | 3h | Monitor + Phase 2 |
| Onboarding integration | 2h | Wizard |
| Rust `apply_calibration()` function | 2h | Types |
| Rust `ComputeInput` extension | 1h | Rust function |
| Performance benchmarks (verify <2ms budget) | 2h | All correction code |

**Phase 3 Total: ~12h**

### Phase 4: Testing & Validation

See Section 12.

---

## 12. Testing Strategy

### 12.1 Unit Tests

```typescript
// CalibrationCapture
describe('CalibrationCapture', () => {
  it('computes correct channel means from uniform ImageData');
  it('computes correct histograms with 256 bins');
  it('rejects capture with high spatial variance');
  it('rejects capture with too-dark exposure');
  it('rejects capture with clipping highlights');
  it('handles edge case: all-black frame');
  it('handles edge case: all-white frame');
});

// CalibrationProfileDeriver
describe('CalibrationProfileDeriver', () => {
  it('computes gain=1.0 for already-neutral input');
  it('computes gainR>1 for blue-shifted input');
  it('clamps exposure gain to [0.5, 2.5]');
  it('estimates ~5000K for neutral daylight R/B ratio');
  it('quality score reflects validation pass rate');
});

// applyCalibrationInPlace
describe('applyCalibrationInPlace', () => {
  it('is identity when all gains are 1.0');
  it('correctly scales RGB channels independently');
  it('clamps to 255 on overflow (Uint8ClampedArray)');
  it('does not modify alpha channel');
  it('processes 640x480 frame in under 2ms');
});

// AmbientLightMonitor
describe('AmbientLightMonitor', () => {
  it('reports stable when luminance is within threshold');
  it('reports unstable after sustained 20%+ shift');
  it('debounces transient changes (< 5 seconds)');
  it('resets change counter when luminance recovers');
});
```

### 12.2 Integration Tests

```typescript
describe('useCalibration + useRealTimeMetrics', () => {
  it('applies correction before MetricsCalculator receives data');
  it('produces consistent metrics across simulated lighting changes');
  it('gracefully degrades when no profile exists (identity correction)');
  it('auto-loads profile when camera device changes');
  it('invalidates profile after validUntil expires');
});
```

### 12.3 Rust Tests

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn apply_calibration_identity() {
        // gains = 1.0 should not change bytes
    }

    #[test]
    fn apply_calibration_clamps_overflow() {
        // 200 * 1.5 = 300 → clamped to 255
    }

    #[test]
    fn apply_calibration_preserves_alpha() {
        // Alpha channel (4th byte in Rgba8) unchanged
    }

    #[test]
    fn compute_with_calibration_differs_from_without() {
        // Verifies calibration actually changes metric output
    }
}
```

### 12.4 Visual Validation

Manual test with known reference:
1. Capture session **without** calibration under warm (2700K) light
2. Calibrate camera under that light
3. Capture session **with** calibration
4. Compare `avgIntensity`, `dominantHue`, `colorEntropy` — should converge toward neutral
5. Repeat under cool (6500K) light — calibrated values should match

---

## Appendix A: Why Not WebGL-Based Correction?

Applying correction in a WebGL shader (before the PIP shader) would be faster (~0.05ms) but adds complexity:
- Requires managing an additional shader program and render pass
- The current pipeline extracts ImageData from a 2D canvas, not from WebGL
- For 640×480 at 500ms intervals, the 0.3ms JS path is already 150× faster than needed

If resolution increases to 1080p+ with <100ms sampling, revisit WebGL correction as an optimization.

## Appendix B: Camera Device ID Stability

The `MediaDevices.deviceId` is:
- **Stable** within a browser origin (same site gets same ID across sessions)
- **Unstable** across browser contexts (incognito, different browsers)
- **Unstable** if user clears site data

The calibration system uses `deviceId` as the primary key but stores `cameraLabel` as a fallback identifier. If a deviceId is not found but a matching label exists, the UI should offer to reassociate the profile.
