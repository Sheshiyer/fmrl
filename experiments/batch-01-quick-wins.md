# Batch 01: Quick Wins - Fix Stuck Metrics

**Goal**: Make scores respond to user movement within 1 second  
**Success Metric**: Score variance increases from <5% to >20%  
**Timeline**: 1-2 hours for all 5 experiments  
**Focus**: Maximum impact, minimum complexity

---

## Baseline Measurement

### Current Behavior (Expected)

1. Run the app and sit still for 30 seconds
2. Measure score ranges:
   - Energy: Should vary with lighting
   - **Symmetry**: Expected ~50 (stuck)
   - **Complexity**: Expected static
   - **Regulation**: Expected static
   - **Color Balance**: Expected static
3. Move left shoulder forward (create asymmetry)
4. Check if Symmetry score changes → **Expected: NO**
5. Wave hand in front of camera (high motion)
6. Check if Regulation score changes → **Expected: NO**

### Baseline Metrics to Record

- [ ] Energy score variance (std dev over 30s)
- [ ] Symmetry score variance
- [ ] Complexity score variance
- [ ] Regulation score variance
- [ ] Frame processing rate (FPS)
- [ ] Perceived lag (time from movement to score change)

---

## Experiment 01: Fix Sampling Rate

**Research Question**: Does deterministic sampling improve responsiveness without killing FPS?

**Current State**:
```typescript
// PIPShader.tsx line ~473
if (onFrameData && Math.random() < 0.2) {  // Only 20% of frames!
```

**Change**:
```typescript
// Replace random sampling with deterministic
if (onFrameData && frameCount % 3 === 0) {  // Every 3rd frame (33%)
```

**Metric**: 
- Primary: Perceived lag (seconds from movement to UI update)
- Secondary: Frame rate (should stay ≥20 FPS)

**Expected Result**: Lag drops from ~1s to <300ms

**Keep if**: Lag improves AND FPS stays ≥20

**File**: `/frontend/src/components/PIPCanvas/PIPShader.tsx`

---

## Experiment 02: Add Saturation Mean Calculation

**Research Question**: Does computing saturation mean make Color Balance responsive?

**Current State**: `saturationMean` defaults to 0.5 (never computed)

**Change**: Add to PIPShader metrics computation:

```typescript
// In the metrics calculation block (after colorEntropy)
let satSum = 0, satCount = 0;
for (let i = 0; i < maskedPixels.length; i += 4) {
  const r = pixels[maskedPixels[i]];
  const g = pixels[maskedPixels[i] + 1];
  const b = pixels[maskedPixels[i] + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  satSum += sat;
  satCount++;
}
const saturationMean = satCount > 0 ? satSum / satCount : 0.5;

// Add to onFrameData callback
onFrameData({ 
  brightness, colorEntropy, horizontalSymmetry, verticalSymmetry,
  saturationMean  // NEW
});
```

**Metric**: Color Balance score variance (before vs after)

**Expected Result**: Color Balance variance increases from <2% to >15%

**Keep if**: Color Balance responds to lighting changes (e.g., turn on/off lamp)

**Files**:
- `/frontend/src/components/PIPCanvas/PIPShader.tsx`
- `/frontend/src/hooks/useRealTimeMetrics.ts` (update callback signature)

---

## Experiment 03: Estimate Fractal Dimension

**Research Question**: Can a simple entropy-based fractal estimate make Complexity responsive?

**Current State**: `fractalDimension` hardcoded to 1.5

**Change**: Add to `useRealTimeMetrics.ts`:

```typescript
// Add helper function
const estimateFractalDim = (brightness: number, entropy: number): number => {
  // Map entropy (0-7) to fractal dimension (1.0-2.0)
  // Higher entropy = more spatial complexity
  const base = 1.0;
  const entropyContrib = Math.min(entropy / 7, 1.0) * 0.8;  // 0-0.8
  const brightnessVariation = Math.abs(brightness - 0.5) * 0.2;  // 0-0.1
  return Math.min(2.0, Math.max(1.0, base + entropyContrib + brightnessVariation));
};

// Use in processFrameData:
const fractalDim = estimateFractalDim(data.brightness, data.colorEntropy);
```

**Metric**: Complexity score variance

**Expected Result**: Complexity varies 1.2-1.8 range instead of stuck at 1.5

**Keep if**: Complexity score changes when scene complexity changes (e.g., hold up patterned cloth)

**File**: `/frontend/src/hooks/useRealTimeMetrics.ts`

---

## Experiment 04: Estimate Hurst Exponent from Temporal Buffer

**Research Question**: Can temporal autocorrelation estimate Hurst and make Coherence responsive?

**Current State**: `hurstExponent` hardcoded to 0.5

**Change**: Add to `useRealTimeMetrics.ts`:

```typescript
// Add helper function
const estimateHurst = (buffer: number[]): number => {
  if (buffer.length < 5) return 0.5;
  
  // Calculate lag-1 autocorrelation
  const mean = buffer.reduce((a, b) => a + b) / buffer.length;
  const variance = buffer.reduce((sum, x) => sum + (x - mean) ** 2, 0) / buffer.length;
  
  let autocorr = 0;
  for (let i = 1; i < buffer.length; i++) {
    autocorr += (buffer[i] - mean) * (buffer[i - 1] - mean);
  }
  autocorr /= (buffer.length - 1) * variance;
  
  // Map [-1, 1] autocorrelation to [0.2, 0.8] Hurst range
  // Positive autocorr = persistent (H > 0.5)
  return 0.5 + autocorr * 0.3;
};

// Use in processFrameData:
brightnessBufferRef.current.push(data.brightness);
if (brightnessBufferRef.current.length > 30) {
  brightnessBufferRef.current.shift();
}
const hurstExp = estimateHurst(brightnessBufferRef.current);
```

**Metric**: Coherence score variance

**Expected Result**: Coherence responds to movement stability (0.4-0.7 range)

**Keep if**: Coherence score is higher when sitting still vs waving hands

**File**: `/frontend/src/hooks/useRealTimeMetrics.ts`

---

## Experiment 05: Fix Symmetry State Propagation

**Research Question**: Does using `useRef` for symmetry values fix the stuck 50% display?

**Current State**: `horizontalSymmetry` computed but may not reach UI due to React batching

**Change**: In `useRealTimeMetrics.ts`:

```typescript
// Add refs for immediate updates
const symmetryRef = useRef({ h: 0.5, v: 0.5 });

// In processFrameData callback:
const hSym = data.horizontalSymmetry ?? 0.5;
const vSym = data.verticalSymmetry ?? 0.5;

// Update ref immediately (bypasses React batching)
symmetryRef.current = { h: hSym, v: vSym };

// Force state update every time (don't wait for batching)
setState(prev => ({
  ...prev,
  metrics: {
    ...prev.metrics,
    horizontalSymmetry: hSym,
    verticalSymmetry: vSym,
  }
}));
```

**Metric**: Symmetry Snapshot update latency (time from asymmetric pose to UI change)

**Expected Result**: Symmetry updates within 500ms instead of staying stuck at 50%

**Keep if**: Symmetry Snapshot shows different values when user tilts head

**File**: `/frontend/src/hooks/useRealTimeMetrics.ts`

---

## Execution Order

**Priority 1** (Do First):
1. Experiment 01 (Sampling Rate) - Foundation fix
2. Experiment 05 (Symmetry Propagation) - Most visible to users

**Priority 2** (If P1 works):
3. Experiment 02 (Saturation Mean) - Easy win
4. Experiment 03 (Fractal Dimension) - Medium difficulty

**Priority 3** (If time permits):
5. Experiment 04 (Hurst Exponent) - More complex

---

## Success Definition

**Batch is successful if**:
- At least 3/5 experiments are kept
- Overall score variance increases ≥20%
- No performance regression (FPS stays ≥20)
- Symmetry Snapshot becomes responsive

**Discard entire batch if**:
- Frame rate drops below 15 FPS
- UI becomes laggy/unresponsive
- Visual glitches appear

---

## Logging Template

After each experiment, add row to `experiments.tsv`:

```
01	Sampling	Does deterministic sampling improve lag?	Random 20%	Every 3rd frame	Perceived lag (ms)	280ms→180ms	keep	FPS stable at 25
02	Metric	Does saturation mean fix Color Balance?	Default 0.5	Compute from RGB	CB variance	2%→18%	keep	Responds to lighting
03	Metric	Does fractal estimate fix Complexity?	Hardcoded 1.5	Entropy-based	Complexity var	0%→12%	keep	Simple but effective
04	Metric	Does Hurst estimate fix Coherence?	Hardcoded 0.5	Temporal autocorr	Coherence var	3%→15%	keep	Good stability signal
05	State	Does useRef fix Symmetry display?	Stuck 50%	Immediate ref update	Symmetry latency	>1s→400ms	keep	Much more responsive
```

---

## Next Batch Ideas (if Batch 01 succeeds)

- **Batch 02: Advanced Metrics** - Implement real DFA, Lyapunov, recurrence
- **Batch 03: UX Polish** - Add animations, trend arrows, sparklines
- **Batch 04: Validation** - Add test fixtures, bounds checking
- **Batch 05: Performance** - Web Workers, GPU acceleration

---

## Ready to Start?

Run baseline measurements first, then execute experiments in priority order.
Log results to `experiments.tsv` after each one.
