# FMRL Product Experiments

**Framework**: Autoresearch loop (Mode 2: Product Research)  
**Project**: Biofield-mirror (FMRL - Frequency Modulated Reality Lens)  
**Goal**: Fix stuck metrics and improve real-time biofield visualization UX

---

## Experiment Philosophy

1. **One change per experiment**
2. **Define success metric before running**
3. **Keep or discard based on results**
4. **Log every run, including failures**
5. **Prefer bounded batches** (5-10 experiments)

---

## Current Baseline

### Technical State

- **Stuck Metrics**: Symmetry (~50), Complexity (static), Regulation (static), Color Balance (static)
- **Root Cause**: Advanced metrics (fractal dimension, Hurst exponent, Lyapunov, etc.) are hardcoded defaults
- **Working**: Basic brightness, color entropy, face/body segmentation via MediaPipe
- **Performance**: 20% sampling rate in PIPShader (only processes 1 in 5 frames)

### User Experience Baseline

- **Real-time feedback**: Slow/laggy due to low sampling rate
- **Metric credibility**: Users notice scores don't respond to changes
- **Symmetry visualization**: Works but stuck at 50%/50%
- **Score dynamics**: Static, not engaging

---

## Experiment Areas

### Area 1: Metric Calculation Fixes

**Problem**: Metrics use hardcoded defaults  
**Success Metric**: Scores vary by ±20% when user moves/changes posture  
**Experiments**:
1. Implement saturation mean calculation in PIPShader
2. Add fractal dimension estimation from entropy
3. Add Hurst exponent estimation from temporal buffer
4. Implement DFA alpha approximation
5. Add Lyapunov estimation from frame-to-frame variance

### Area 2: Sampling & Performance

**Problem**: Only 20% of frames processed (`Math.random() < 0.2`)  
**Success Metric**: Perceived responsiveness (< 200ms lag) + stable frame rate  
**Experiments**:
1. Deterministic sampling (every 3rd frame instead of random)
2. Increase to 50% sampling rate
3. Move metrics to Web Worker
4. Implement frame skipping under CPU load
5. Add throttling based on frame delta

### Area 3: State Propagation

**Problem**: Computed symmetry may not reach score display  
**Success Metric**: Symmetry snapshot updates within 1 second of user movement  
**Experiments**:
1. Use `useRef` instead of `useState` for high-frequency updates
2. Add debug logging to track value flow
3. Batch state updates with `useReducer`
4. Add metric timestamp validation
5. Implement snapshot diffing to force re-renders

### Area 4: UX & Visual Feedback

**Problem**: Static scores feel unresponsive  
**Success Metric**: User perceives "liveness" (qualitative + time-to-first-change)  
**Experiments**:
1. Add pulsing animation to changing scores
2. Show trend arrows (↑↓) on metrics panel
3. Add "last updated" timestamp
4. Color-code scores by stability (green=stable, yellow=changing)
5. Add mini sparkline charts to score cards

### Area 5: Validation & Testing

**Problem**: No way to know if metrics are correct  
**Success Metric**: 80% of test cases pass  
**Experiments**:
1. Create test fixture (known asymmetric face photo)
2. Add unit tests for ScoreCalculator
3. Compare PIP metrics to baseline photos
4. Add metric bounds validation (reject impossible values)
5. Implement sanity checks (e.g., symmetry should be 0-1)

---

## Experiment Log Structure

```
id | area | question | baseline | change | metric | result | decision | notes
```

**Example Row**:
```
01 | Metric | Does saturation mean improve color balance responsiveness? | Default 0.5 | Compute from RGB in shader | Color Balance score variance | +35% variance | keep | Much more dynamic now
```

---

## Success Criteria

An experiment is **successful** if:

1. **Primary metric improves** by ≥15%
2. **No performance regression** (frame rate stays ≥20 FPS)
3. **No new bugs** introduced (visual glitches, crashes)
4. **Code complexity** stays manageable (≤50 lines per change)

An experiment is **discarded** if:

- Metric worsens or shows no change
- Performance drops below acceptable threshold
- Introduces visual artifacts
- Makes codebase harder to understand

---

## Next Steps

1. Set baseline metrics (run current build, measure score variance)
2. Pick highest-value experiment area
3. Run first batch of 5 experiments
4. Review results and iterate
