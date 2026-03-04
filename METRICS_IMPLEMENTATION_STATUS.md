# PIP Metrics Implementation Status

## Overview

This document summarizes the current state of the metrics calculation system, what has been implemented, and what issues remain for the next developer to address.

---

## Architecture Summary

### Data Flow

```
œPIPShader.tsx (WebGL render loop)
    ↓ onFrameData callback
    ↓ { brightness, colorEntropy, horizontalSymmetry, verticalSymmetry }
    ↓
PIPCanvasPanel.tsx
    ↓ handleFrameData → onMetricsUpdate
    ↓
App.tsx
    ↓ processFrameData (from useRealTimeMetrics hook)
    ↓
useRealTimeMetrics.ts
    ↓ Creates MetricsInput object
    ↓ Calls scoreCalculator.calculateAll()
    ↓
ScoreCalculator.ts
    ↓ Returns CompositeScores
    ↓
MetricsScoresPanel.tsx (displays scores)
```

---

## Current Implementation Status

### ✅ Working Components

1. **Real-time ML Segmentation** (`PIPShader.tsx`)

   - Face detection using MediaPipe Face Mesh
   - Body segmentation using MediaPipe Selfie Segmentation
   - Mask-based region filtering
2. **Basic Frame Metrics** (computed in `PIPShader.tsx` render loop)

   - `brightness` - average pixel intensity in masked region
   - `colorEntropy` - variance-based entropy estimate
3. **Symmetry Calculation** (computed in `PIPShader.tsx`)

   - `horizontalSymmetry` - left-right bilateral comparison
   - `verticalSymmetry` - top-bottom comparison

### ❌ NOT Working / Stuck at Default Values

| Metric            | Current Value | Why It's Stuck                                                          |
| ----------------- | ------------- | ----------------------------------------------------------------------- |
| Symmetry Score    | ~50           | `horizontalSymmetry` computed but may not be reaching ScoreCalculator |
| Complexity        | Static        | `fractalDimension` hardcoded to 1.5                                   |
| Regulation        | Static        | Missing `lyapunovExponent`, `dfaAlpha`, `recurrenceRate`          |
| Color Balance     | Static        | Missing `saturationMean`, proper `colorCoherence`                   |
| Fractal Dim       | 1.5           | Never computed, hardcoded default                                       |
| Hurst Exp         | 0.5           | Never computed, hardcoded default                                       |
| Symmetry Snapshot | 50%/50%       | Uses `metrics.horizontalSymmetry` which may not update                |

---

## Key Files to Examine

### 1. `/frontend/src/components/PIPCanvas/PIPShader.tsx`

**Lines 473-545**: Metrics computation in render loop

```typescript
// Current implementation computes:
if (onFrameData && Math.random() < 0.2) {  // Only 20% of frames!
  // ... computes brightness, colorEntropy, horizontalSymmetry, verticalSymmetry
  onFrameData({ brightness, colorEntropy, horizontalSymmetry, verticalSymmetry });
}
```

**ISSUE**: The `Math.random() < 0.2` means metrics only update ~20% of frames. This could cause perceived "stuckness".

### 2. `/frontend/src/hooks/useRealTimeMetrics.ts`

**Lines 248-306**: `processFrameData` callback

```typescript
const processFrameData = useCallback((data: { 
  brightness: number; 
  colorEntropy: number;
  horizontalSymmetry?: number;  // Optional!
  verticalSymmetry?: number;    // Optional!
}) => {
  const hSym = data.horizontalSymmetry ?? 0.5;  // Falls back to 0.5 if undefined
  const vSym = data.verticalSymmetry ?? 0.5;
  
  // These are HARDCODED or poorly estimated:
  const estimatedMetrics: MetricsInput = {
    fractalDimension: state.metrics.fractalDim,  // Never changes from 1.5
    hurstExponent: state.metrics.hurstExp,       // Never changes from 0.5
    // ... other metrics
  };
```

**ISSUES**:

1. `fractalDimension` and `hurstExponent` are read from state but never updated
2. Temporal metrics (`temporalStability`, `patternRegularity`) are computed but may not affect scores significantly

### 3. `/frontend/src/services/ScoreCalculator.ts`

**Score Calculation Formulas**:

#### Symmetry Score (Lines 100-109)

```typescript
calculateSymmetryScore(metrics: MetricsInput): number {
  const bodySymmetry = metrics.bodySymmetry ?? metrics.horizontalSymmetry ?? 0.5;
  const contourBalance = metrics.horizontalSymmetry ?? 0.5;
  const colorSymmetry = metrics.colorSymmetry ?? 0.5;
  
  // 50% body + 30% contour + 20% color
  return Math.round((0.50 * bodySymmetry + 0.30 * contourBalance + 0.20 * colorSymmetry) * 100);
}
```

#### Complexity Score (Lines 127-150)

```typescript
calculateComplexityScore(metrics: MetricsInput): number {
  const fd = metrics.fractalDimension ?? 1.5;  // HARDCODED DEFAULT
  const fdNorm = Math.max(0, Math.min(1, fd - 1.0));  // Maps 1.0-2.0 → 0-1
  
  const entropy = metrics.colorEntropy ?? 5;
  const entropyNorm = Math.min(entropy / 7, 1);
  
  // ... other components also use defaults
  return Math.round(score * 100);
}
```

#### Regulation Score (Lines 153-175)

```typescript
calculateRegulationScore(metrics: MetricsInput): number {
  const lyap = metrics.lyapunovExponent ?? 0;      // NEVER PROVIDED
  const dfa = metrics.dfaAlpha ?? 1.0;             // NEVER PROVIDED
  const tempVar = metrics.temporalVariance ?? 0.15; // NEVER PROVIDED
  const recurrence = metrics.recurrenceRate ?? 0.5; // NEVER PROVIDED
  
  // All use defaults → static score
}
```

#### Color Balance Score (Lines 178-197)

```typescript
calculateColorBalanceScore(metrics: MetricsInput): number {
  const uniformity = Math.min((metrics.colorEntropy ?? 5) / 7, 1);
  const hueBalance = metrics.saturationMean ?? 0.5;      // NEVER PROVIDED
  const satConsistency = metrics.saturationMean ?? 0.5;  // NEVER PROVIDED
  const coherence = metrics.colorCoherence ?? 0.5;       // Estimated but weak
  
  // Mostly defaults → static score
}
```

### 4. `/frontend/src/components/Panels/MetricsScoresPanel.tsx`

**Lines 55-58**: Symmetry Snapshot uses metrics directly

```typescript
const symmetrySnapshotData: SymmetrySnapshotData = useMemo(() => ({
  innerSymmetry: Math.round(metrics.horizontalSymmetry * 100),
  outerSymmetry: Math.round(metrics.verticalSymmetry * 100),
}), [metrics.horizontalSymmetry, metrics.verticalSymmetry]);
```

**ISSUE**: If `metrics.horizontalSymmetry` stays at 0.5, snapshot shows 50%.

---

## Root Causes of Stuck Scores

### 1. Missing Metric Computations

These metrics are **never computed** anywhere in the codebase:

| Metric                   | Required By   | Current State |
| ------------------------ | ------------- | ------------- |
| `fractalDimension`     | Complexity    | Hardcoded 1.5 |
| `hurstExponent`        | Coherence     | Hardcoded 0.5 |
| `lyapunovExponent`     | Regulation    | Default 0     |
| `dfaAlpha`             | Regulation    | Default 1.0   |
| `recurrenceRate`       | Regulation    | Default 0.5   |
| `saturationMean`       | Color Balance | Default 0.5   |
| `correlationDimension` | Complexity    | Default 0.5   |

### 2. Data Flow Breakage

The symmetry values ARE computed in `PIPShader.tsx` but may not reach the scores because:

1. **Optional parameters**: `horizontalSymmetry?: number` means if undefined, falls back to 0.5
2. **Sampling rate**: Only 20% of frames trigger `onFrameData`
3. **State updates**: React state batching may cause stale values

### 3. Backend Dependency

The `MetricsCalculator.ts` service has proper implementations for:

- `calculateSymmetry()` (Lines 208-260)
- Fractal dimension (requires time series data)
- Hurst exponent (requires time series data)

But these are only used when processing `ImageData` directly via `processFrame()`, NOT via `processFrameData()`.

---

## Recommended Fixes

### Fix 1: Compute Missing Metrics in PIPShader

Add to the render loop in `PIPShader.tsx`:

```typescript
// Compute saturation mean
let satSum = 0, satCount = 0;
for (let i = 0; i < maskedPixels.length; i++) {
  const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  satSum += sat;
  satCount++;
}
const saturationMean = satCount > 0 ? satSum / satCount : 0.5;

// Pass to callback
onFrameData({ 
  brightness, colorEntropy, horizontalSymmetry, verticalSymmetry,
  saturationMean  // ADD THIS
});
```

### Fix 2: Implement Fractal Dimension Estimation

In `useRealTimeMetrics.ts`, add box-counting approximation:

```typescript
// Estimate fractal dimension from spatial complexity
const estimateFractalDim = (brightness: number, entropy: number): number => {
  // Higher entropy + moderate brightness → higher fractal dimension
  // Range: 1.0 (simple) to 2.0 (complex)
  const base = 1.0;
  const entropyContrib = entropy * 0.1;  // 0-0.7 contribution
  const brightnessContrib = Math.abs(brightness - 0.5) * 0.3;  // Edge cases add complexity
  return Math.min(2.0, Math.max(1.0, base + entropyContrib + brightnessContrib));
};
```

### Fix 3: Implement Hurst Exponent Estimation

```typescript
// Estimate Hurst from temporal autocorrelation
const estimateHurst = (temporalBuffer: number[]): number => {
  if (temporalBuffer.length < 5) return 0.5;
  
  // Calculate lag-1 autocorrelation
  let sum = 0, count = 0;
  for (let i = 1; i < temporalBuffer.length; i++) {
    sum += temporalBuffer[i] * temporalBuffer[i - 1];
    count++;
  }
  const autocorr = count > 0 ? sum / count : 0;
  
  // Map autocorrelation to Hurst (0.5 = random, >0.5 = persistent)
  return 0.5 + autocorr * 0.3;
};
```

### Fix 4: Increase Sampling Rate

Change in `PIPShader.tsx`:

```typescript
// From:
if (onFrameData && Math.random() < 0.2) {
// To:
if (onFrameData && frameCount % 3 === 0) {  // Every 3rd frame, deterministic
```

### Fix 5: Ensure State Updates Propagate

In `useRealTimeMetrics.ts`, update the metrics state properly:

```typescript
setState(prev => ({
  ...prev,
  scores,
  metrics: {
    lqd: estimatedMetrics.lightQuantaDensity ?? 0,
    avgIntensity: estimatedMetrics.avgIntensity ?? 0,
    innerNoise: estimatedMetrics.innerNoisePercent ?? 0,
    fractalDim: estimatedFractalDim,  // USE COMPUTED VALUE
    hurstExp: estimatedHurst,          // USE COMPUTED VALUE
    horizontalSymmetry: hSym,          // ENSURE THIS IS SET
    verticalSymmetry: vSym,            // ENSURE THIS IS SET
  },
  timeline: [...timelineRef.current],
}));
```

---

## File Locations Quick Reference

| File                                                        | Purpose                                                   |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `/frontend/src/components/PIPCanvas/PIPShader.tsx`        | WebGL rendering, frame metrics computation                |
| `/frontend/src/hooks/useRealTimeMetrics.ts`               | Metrics state management, score calculation orchestration |
| `/frontend/src/services/ScoreCalculator.ts`               | Score formulas (Energy, Symmetry, Coherence, etc.)        |
| `/frontend/src/services/MetricsCalculator.ts`             | Low-level metrics (symmetry, entropy, etc.)               |
| `/frontend/src/components/Panels/MetricsScoresPanel.tsx`  | UI display of scores                                      |
| `/frontend/src/components/Cards/SymmetrySnapshotCard.tsx` | Symmetry visualization                                    |

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Symmetry score changes when user moves asymmetrically
- [ ] Symmetry Snapshot (Inner/Outer) updates in real-time
- [ ] Complexity score varies with scene complexity
- [ ] Regulation score responds to movement stability
- [ ] Color Balance changes with lighting conditions
- [ ] Fractal Dim shows values between 1.0-2.0
- [ ] Hurst Exp shows values between 0-1

---

## Summary

The core issue is that **most advanced metrics are never computed** - they use hardcoded defaults. The symmetry calculation exists but may not propagate correctly through the React state system. The next developer should:

1. Add missing metric computations to `PIPShader.tsx` or `useRealTimeMetrics.ts`
2. Ensure all computed values are passed through the callback chain
3. Verify React state updates trigger re-renders with new values
4. Consider using `useRef` for high-frequency updates instead of `useState`
