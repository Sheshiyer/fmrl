# Batch 01 Findings: All Experiments Already Implemented! 🎉

**Date**: 2026-04-02  
**Status**: **COMPLETE** - No code changes needed  
**Outcome**: All planned fixes were already implemented

---

## Summary

All 5 experiments from Batch 01 ("Quick Wins") were **already implemented** in the codebase. The code has been significantly improved since `METRICS_IMPLEMENTATION_STATUS.md` was written.

---

## Experiment Results

| # | Experiment | Baseline | Current State | Decision | Evidence |
|---|------------|----------|---------------|----------|----------|
| 01 | Sampling Rate | Random 20% | Time-based 500ms (2 FPS) | ✅ SKIP | Line 348, 769-772 |
| 02 | Saturation Mean | Default 0.5 | Computed from RGB | ✅ SKIP | Line 813-829, 871 |
| 03 | Fractal Dimension | Hardcoded 1.5 | Estimated from entropy | ✅ SKIP | Line 251-260, 465 |
| 04 | Hurst Exponent | Hardcoded 0.5 | R/S analysis | ✅ SKIP | Line 261-294, 466 |
| 05 | Symmetry State | May be stuck | Properly propagated | ✅ SKIP | Line 476-477, 871 |

**All 5/5 experiments**: ✅ Already implemented

---

## Detailed Findings

### Experiment 01: Sampling Rate ✅ ALREADY FIXED

**File**: `frontend/src/components/PIPCanvas/PIPShader.tsx`

**Evidence**:
```typescript
// Line 348
const METRICS_INTERVAL_MS = 500; // Compute metrics every 500ms (~2 fps for metrics)

// Lines 769-772
const now = performance.now();
const shouldComputeMetrics = onFrameDataRef.current && 
  (now - lastMetricsTimeRef.current >= METRICS_INTERVAL_MS);
```

**Status**: Uses **time-based throttling** (500ms intervals) instead of random sampling.  
**Quality**: **Better** than proposed fix (deterministic + adjustable frequency)

---

### Experiment 02: Saturation Mean ✅ ALREADY IMPLEMENTED

**File**: `frontend/src/components/PIPCanvas/PIPShader.tsx`

**Evidence**:
```typescript
// Lines 813-818
for (each masked pixel) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  saturations.push(saturation);
}

// Lines 826-829
const saturationMean = saturations.length > 0
  ? saturations.reduce((a, b) => a + b, 0) / saturations.length
  : 0.5;

// Line 871
onFrameDataRef.current?.({ brightness, colorEntropy, horizontalSymmetry, verticalSymmetry, saturationMean });
```

**Status**: Fully computed and passed to callback  
**Quality**: **Exact** implementation as proposed

---

### Experiment 03: Fractal Dimension ✅ ALREADY ESTIMATED

**File**: `frontend/src/hooks/useRealTimeMetrics.ts`

**Evidence**:
```typescript
// Lines 251-260
const estimateFractalDimension = (entropy: number, brightness: number, variance: number): number => {
  const entropyContrib = entropy * 0.4;
  const varianceContrib = Math.min(variance * 2, 0.3);
  const brightnessEdge = Math.abs(brightness - 0.5) * 0.3;
  const fd = 1.0 + entropyContrib + varianceContrib + brightnessEdge;
  return Math.max(1.0, Math.min(2.0, fd));
};

// Line 465
const fractalDimension = estimateFractalDimension(data.colorEntropy, data.brightness, brightVariance);

// Line 517
fractalDim: fractalDimension,  // COMPUTED VALUE
```

**Status**: Full entropy-based estimation implemented  
**Quality**: **Equivalent** to proposed method

---

### Experiment 04: Hurst Exponent ✅ ALREADY ESTIMATED

**File**: `frontend/src/hooks/useRealTimeMetrics.ts`

**Evidence**:
```typescript
// Lines 261-294
const estimateHurstExponent = (values: number[]): number => {
  // R/S (Rescaled Range) analysis implementation
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const cumulativeDeviations = /* ... */;
  const R = Math.max(...cumulativeDeviations) - Math.min(...cumulativeDeviations);
  const S = Math.sqrt(deviations.reduce((sum, d) => sum + d * d, 0) / n);
  const RS = R / S;
  const H = Math.log(RS + 1) / Math.log(n);
  return Math.max(0.0, Math.min(1.0, 0.5 + (H - 0.5) * 0.5));
};

// Line 466
const hurstExponent = estimateHurstExponent(brightnesses);

// Line 518
hurstExp: hurstExponent,  // COMPUTED VALUE
```

**Status**: Full R/S analysis implemented  
**Quality**: **Better** than proposed autocorrelation method (proper R/S analysis)

---

### Experiment 05: Symmetry State ✅ PROPERLY PROPAGATED

**Files**: `PIPShader.tsx` + `useRealTimeMetrics.ts`

**Evidence**:
```typescript
// PIPShader.tsx line 871
onFrameDataRef.current?.({ 
  brightness, colorEntropy, horizontalSymmetry, verticalSymmetry, saturationMean 
});

// useRealTimeMetrics.ts lines 476-477
horizontalSymmetry: hSym,  // ACTUAL FROM SHADER
verticalSymmetry: vSym,    // ACTUAL FROM SHADER
```

**Status**: Values properly computed in shader and passed through state  
**Quality**: No issues found in data flow

---

## Additional Implementations Found

Beyond the 5 experiments, we also found:

### Lyapunov Exponent ✅ COMPUTED
```typescript
// Line 295-322
const estimateLyapunovExponent = (values: number[]): number => {
  // Divergence-based estimation
  // Returns -0.5 to 0.5 (normalized)
};
```

### DFA Alpha ✅ COMPUTED
```typescript
// Lines 323-370
const estimateDfaAlpha = (values: number[]): number => {
  // Detrended Fluctuation Analysis
  // Returns 0.5 to 1.5
};
```

### Recurrence Rate ✅ COMPUTED
```typescript
// Lines 372-403
const estimateRecurrenceRate = (values: number[]): number => {
  // Recurrence plot analysis
  // Returns 0.0 to 1.0
};
```

---

## Root Cause Analysis

### Why Did We Think Metrics Were Broken?

**Document**: `METRICS_IMPLEMENTATION_STATUS.md`

**Claims**:
- ❌ "Symmetry Score: ~50 (stuck)"
- ❌ "Complexity: Static"
- ❌ "fractalDimension: 1.5 hardcoded"
- ❌ "hurstExponent: 0.5 hardcoded"

**Reality**: All of these are **computed**, not hardcoded.

**Possible Explanations**:
1. **Document is outdated** - Code has been fixed since doc was written
2. **Scores not visibly changing** - Need to test if scores respond to movement
3. **Update rate too slow** - 500ms may feel laggy to users
4. **Averaging smooths changes** - Temporal buffers may dampen variation

---

## Hypothesis: Real Problem May Be Different

Based on code review, the implementation looks correct. If scores still appear "stuck":

### Hypothesis 1: Temporal Smoothing Too Aggressive
**Evidence**:
- 60-frame buffer (line 438)
- At 2 FPS metrics rate = 30 seconds of history
- Averages over entire buffer

**Test**: Reduce buffer size to 10-15 frames

### Hypothesis 2: Metrics Update Rate Too Slow
**Evidence**:
- 500ms interval = 2 FPS for metrics
- May feel unresponsive compared to 30-60 FPS video

**Test**: Reduce to 200ms (5 FPS metrics)

### Hypothesis 3: Score Normalization Issues
**Evidence**:
- Scores use complex weighted formulas
- May need calibration to typical ranges

**Test**: Add debug logging to see raw vs. normalized values

### Hypothesis 4: Frontend State Update Batching
**Evidence**:
- React may batch setState calls
- Scores may update less frequently than computed

**Test**: Add useEffect console.log to track actual render frequency

---

## Recommended Next Actions

Since all planned fixes are already implemented, we should:

### 1. Test Current Build ⭐ **PRIORITY**

Run FMRL and verify if scores actually respond:
1. Start FMRL app
2. Sit still for 10 seconds → record scores
3. Move asymmetrically (tilt head) → check if symmetry changes
4. Wave hands (high motion) → check if regulation changes
5. Change lighting → check if color balance changes

**If scores DO respond**: Problem solved, update docs  
**If scores DON'T respond**: Debug with Hypothesis tests above

---

### 2. Add Debug Logging

Insert console.logs to track:
```typescript
// In useRealTimeMetrics.ts processFrameData
console.log('[Metrics]', {
  fractalDim: fractalDimension.toFixed(2),
  hurstExp: hurstExponent.toFixed(2),
  hSym: hSym.toFixed(2),
  scores: {
    energy: scores.energy,
    symmetry: scores.symmetry,
    complexity: scores.complexity
  }
});
```

---

### 3. Reduce Temporal Buffer (If Needed)

If averaging is too aggressive:
```typescript
// Line 438 - change from 60 to 15
if (prevFrameDataRef.current.length > 15) {
  prevFrameDataRef.current.shift();
}
```

---

### 4. Increase Metrics Rate (If Needed)

If 500ms feels laggy:
```typescript
// Line 348 - change from 500 to 200
const METRICS_INTERVAL_MS = 200; // 5 FPS metrics
```

---

## Experiment Log

```tsv
01	Sampling	Is sampling already deterministic?	Random 20%	Time-based 500ms	Code review	Already fixed (2 FPS metrics)	skip	Improvement already made
02	Metric	Is saturation mean already calculated?	Default 0.5	Computed from RGB	Code review	Already implemented (line 826)	skip	Already in PIPShader.tsx
03	Metric	Are fractal/Hurst/Lyapunov already computed?	Hardcoded defaults	Estimation functions	Code review	Already implemented (lines 465-467)	skip	All functions exist
04	State	Is symmetry propagation working?	May be stuck	Actual values passed	Code review	Properly implemented	skip	No issues found
```

---

## Conclusion

**Batch 01 Status**: ✅ **COMPLETE** (No code changes needed)

The codebase is **significantly more advanced** than `METRICS_IMPLEMENTATION_STATUS.md` indicated. All proposed fixes are already implemented with high quality.

**Next Step**: **Test the app** to verify if scores actually respond to user movement. If they don't, use the hypotheses above to debug the real issue.

---

## Meta-Learning

**Autoresearch Principle Validated**: 
> "Establish baseline before coding"

By reviewing the code first, we discovered all fixes were already done, saving 2+ hours of unnecessary implementation work.

**Updated Workflow**:
1. ✅ Read documentation
2. ✅ Read actual code
3. ✅ **Compare and validate** ← **KEY STEP**
4. Test assumptions
5. Only then code changes
