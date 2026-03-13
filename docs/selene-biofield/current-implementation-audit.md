# Current Biofield Mirror Implementation Audit

_Last updated: 2026-03-08_

## Executive summary

Biofield Mirror already has a meaningful product shape and a usable scoring engine, but it does **not** yet have one canonical persisted data contract. Today the app operates through multiple partially overlapping paths:

1. **Live dashboard path** — frontend-driven, in-memory, score-first
2. **Backend capture analysis path** — richer backend metric engine, but not yet canonical for the main dashboard
3. **Legacy/shared app-state path** — older global state types for baselines, history, and session identifiers

This split is the central integration problem that must be solved before safe Selene persistence can be considered complete.

---

## 1. Main live dashboard path

### Files
- `frontend/src/App.tsx`
- `frontend/src/components/Panels/PIPCanvasPanel.tsx`
- `frontend/src/hooks/useRealTimeMetrics.ts`
- `frontend/src/services/ScoreCalculator.ts`
- `frontend/src/components/Panels/MetricsScoresPanel.tsx`
- `frontend/src/components/Layout/TimelineStrip.tsx`

### Current flow
1. `PIPCanvasPanel` renders the live stage and emits frame-derived metrics.
2. `App.tsx` passes those live metrics into `useRealTimeMetrics`.
3. `useRealTimeMetrics.ts` derives raw metrics, temporal metrics, nonlinear approximations, and composite scores.
4. `MetricsScoresPanel.tsx` renders score tabs, telemetry, and symmetry state.
5. `TimelineStrip.tsx` renders a session timeline driven by in-memory score points.

### Current live state
`useRealTimeMetrics.ts` exposes:
- `scores`
  - `energy`
  - `symmetry`
  - `coherence`
  - `complexity`
  - `regulation`
  - `colorBalance`
- `metrics`
  - `lqd`
  - `avgIntensity`
  - `innerNoise`
  - `fractalDim`
  - `hurstExp`
  - `horizontalSymmetry`
  - `verticalSymmetry`
- `timeline`
  - `time`
  - `energy`
  - `symmetry`
  - `coherence`
- `sessionDuration`
- `isConnected`

### Observations
- The main dashboard is currently **in-memory first**.
- Timeline points are not persisted.
- Capture in the main stage still begins from the stage component and local image capture rather than from a canonical persisted session contract.
- The live model already exposes the right *shape* for later persistence, but not yet the right *ownership and lifecycle semantics*.

---

## 2. Backend capture / detailed analysis path

### Files
- `frontend/src/hooks/useFrameCapture.ts`
- `backend/api/routes/analysis.py`
- `backend/core/metrics/*`
- `backend/core/scores/*`
- `frontend/src/pages/DetailedAnalysis.tsx`

### Current flow
1. `useFrameCapture.ts` captures a canvas frame and POSTs it to `/api/v1/analysis/capture`.
2. `backend/api/routes/analysis.py` decodes the image and computes:
   - basic metrics
   - color metrics
   - geometric metrics
   - contour metrics
   - nonlinear metrics
   - symmetry metrics
3. The backend returns a structured response containing:
   - analysis id
   - timestamp
   - mode
   - metrics payload
   - scores payload
   - images payload
4. `DetailedAnalysis.tsx` renders the resulting values.

### Important gap
The current dashboard **Capture** button is not yet using the backend capture path as the canonical persisted analysis write path. Instead, the detail view can still be bootstrapped from local in-memory state.

---

## 3. Shared / legacy app-state path

### Files
- `frontend/src/context/appState.ts`
- `frontend/src/types/index.ts`

### Existing concepts already modeled
- `baseline`
- `metricsHistory`
- `sessionId`
- `AnalysisResult`
- `BaselineData`
- `MetricsHistoryEntry`

### Observation
These types show that the app has long intended to support sessions, baselines, and history, but the active dashboard path is not fully wired through this global state model anymore. This produces architectural duplication.

---

## 4. Current score model

### Canonical score set
Defined in `frontend/src/services/ScoreCalculator.ts`:
- `energy`
- `symmetry`
- `coherence`
- `complexity`
- `regulation`
- `colorBalance`

### Score inputs by category
- **Energy**
  - `lightQuantaDensity`
  - `avgIntensity`
  - energy proxy
  - `normalizedArea`
- **Symmetry**
  - `bodySymmetry` or `horizontalSymmetry`
  - contour balance proxy
  - `colorSymmetry`
- **Coherence**
  - `patternRegularity`
  - `temporalStability`
  - `hurstExponent`
  - `colorCoherence`
- **Complexity**
  - `fractalDimension`
  - `colorEntropy`
  - `correlationDimension`
  - `contourComplexity`
  - `innerNoisePercent`
- **Regulation**
  - `lyapunovExponent`
  - `dfaAlpha`
  - `temporalVariance`
  - `recurrenceRate`
  - `temporalStability`
- **Color Balance**
  - color entropy/uniformity
  - `saturationMean`
  - `colorCoherence`
  - symmetry proxy

### Observation
The score model is already explicit and useful. The main task is not to invent a new score vocabulary, but to normalize and persist the existing one with provenance.

---

## 5. Current raw metric model

### Frontend live metrics
From `useRealTimeMetrics.ts` and `MetricsCalculator.ts`:
- brightness / average intensity
- light quanta density
- normalized area
- intensity deviation
- inner noise
- horizontal symmetry
- vertical symmetry
- dominant hue
- saturation mean
- color entropy
- frame-to-frame change
- temporal stability
- pattern regularity
- heuristic nonlinear estimates:
  - fractal dimension
  - Hurst exponent
  - Lyapunov exponent
  - DFA alpha
  - recurrence rate

### Backend detailed metrics
From `backend/api/routes/analysis.py` and backend metric modules:
- basic metrics
- color metrics
- geometric metrics
- contour metrics
- nonlinear metrics
- symmetry metrics

### Observation
The backend and frontend do not yet share one canonical persistence contract for raw metrics. Any data model must distinguish:
- **live estimated metrics**
- **backend detailed metrics**
- future **parity-checked compute paths**

---

## 6. Session and timeline behavior today

### Current session lifecycle
From `useRealTimeMetrics.ts`:
- session start time is initialized locally
- session duration increments every second
- timeline is in-memory only
- reset clears timeline and duration

### Current timeline shape
Each point contains:
- `time`
- `energy`
- `symmetry`
- `coherence`

### Observation
The current timeline is presentation-ready but persistence-poor. It lacks canonical ownership, flush policy, write cadence, and session linkage.

---

## 7. Snapshot / detailed analysis behavior today

### Current detail view input shape
From `frontend/src/pages/DetailedAnalysis.tsx`:
- `timestamp`
- `scores`
- `metrics`
- `timeline`
- `sessionDuration`
- `imageUrl`

### Observation
This is already close to a canonical snapshot aggregate, but:
- it is not currently guaranteed to be loaded from persisted identifiers
- it assumes in-memory continuity
- it lacks provenance and reading/session linkage in the UI contract

---

## 8. Current account/profile surface

### Files
- `frontend/src/pages/AccountPage.tsx`

### Observation
The Account page is currently a UI shell only. It is the right insertion point for Selene profile integration but does not yet read or write live account data.

---

## 9. Primary architecture gaps

### Gap A — Multiple truths
The app currently has at least three overlapping data contracts:
- live dashboard state
- backend detailed analysis result
- shared legacy state/types

### Gap B — No canonical persisted session model
There is no explicit durable Biofield session record yet.

### Gap C — No canonical snapshot model
Capture and detailed analysis are not yet consistently modeled as persisted snapshots linked to sessions and readings.

### Gap D — No timeline persistence
Timeline points are transient.

### Gap E — No provenance/version contract
The system does not yet persist enough metadata to distinguish live estimates from backend-detailed analysis.

### Gap F — No unified profile integration
The Account page and profile data are not yet wired to Selene.

---

## 10. Recommended architecture direction

The safest path is to keep **Selene readings as the top-level canonical analysis record** and add Biofield-specific structure around it for:
- sessions
- snapshots
- timeline points
- baselines
- artifacts

This preserves existing Selene architecture while allowing Biofield Mirror to become a first-class engine/workflow inside the product.
