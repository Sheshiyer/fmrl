# Audio Entrainment System — Architecture Specification

> **GAP-012 · Issue #272 · Phase 6 / P2**
> **Status:** Draft · **Author:** Architect Agent · **Date:** 2025-07-16
> **Stack:** React 19 + TypeScript + Web Audio API + Tauri 2

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Audio Entrainment Background](#2-audio-entrainment-background)
3. [System Architecture](#3-system-architecture)
4. [Web Audio API Design](#4-web-audio-api-design)
5. [Metric-to-Audio Mapping](#5-metric-to-audio-mapping)
6. [Brainwave Frequency Bands](#6-brainwave-frequency-bands)
7. [Session Modes](#7-session-modes)
8. [React Hook API — `useAudioEntrainment`](#8-react-hook-api--useaudioentrainment)
9. [Session-Responsive Feedback Loop](#9-session-responsive-feedback-loop)
10. [UI Components](#10-ui-components)
11. [Performance & Constraints](#11-performance--constraints)
12. [Tauri Desktop Considerations](#12-tauri-desktop-considerations)
13. [TypeScript Interfaces](#13-typescript-interfaces)
14. [Implementation Plan](#14-implementation-plan)
15. [Testing Strategy](#15-testing-strategy)
16. [Appendix — References](#16-appendix--references)

---

## 1. Executive Summary

The Audio Entrainment System generates real-time binaural beats and isochronal tones that adapt to the user's biofield state. As composite scores (energy, symmetry, coherence, complexity, regulation, colorBalance) change during a session, the audio parameters shift to encourage the user toward a desired brainwave state—relaxation, focus, or deep meditation.

**Core Principle:** The audio system is a *response* to the biofield, not a driver. It reads existing `CompositeScores` (already computed at ~2 FPS via `useRealTimeMetrics`) and translates them into psychoacoustic parameters. The user's biofield changes → audio adapts → encourages desired state → biofield responds → feedback loop.

**Key Constraints:**
- Zero impact on frame processing pipeline (Web Audio runs on its own thread)
- No external audio libraries required (native Web Audio API only)
- Graceful degradation when `AudioContext` is unavailable
- Works in both browser and Tauri desktop contexts
- Respects autoplay policies and user audio preferences

---

## 2. Audio Entrainment Background

### 2.1 Binaural Beats

When two tones of slightly different frequencies are presented separately to each ear (via headphones), the brain perceives a third "phantom" tone at the difference frequency. This difference frequency can entrain brainwave activity toward a target state.

```
Left Ear:  200 Hz (carrier)
Right Ear: 210 Hz (carrier + beat frequency)
───────────────────────────────────
Perceived: 10 Hz beat → Alpha brainwave entrainment
```

**Requirements:** Stereo headphones. The carrier frequency should be below ~1000 Hz for effective perception. Beat frequencies align to brainwave bands (0.5–100 Hz).

### 2.2 Isochronal Tones

Rhythmic on/off pulses of a single tone at the target frequency. Unlike binaural beats, isochronal tones work through speakers (no headphones required) and are effective at lower carrier volumes.

```
Tone: 200 Hz, pulsed at 10 Hz
─── ON ─── OFF ─── ON ─── OFF ───  (100ms cycle)
```

**Advantage:** Accessible without headphones. Can be combined with binaural beats for stronger entrainment.

### 2.3 Mapping to Biofield Analysis

The biofield analysis system computes 6 composite scores in real-time. Each score maps to a psychoacoustic dimension:

| Biofield Metric | Audio Parameter | Psychoacoustic Rationale |
|----------------|----------------|--------------------------|
| **Coherence** | Beat frequency (Hz) | High coherence → slower beats (alpha/theta) → reflects ordered state |
| **Energy** | Volume / amplitude | More energy → richer sound presence |
| **Symmetry** | Stereo balance | Balanced biofield → centered stereo image |
| **Regulation** | Temporal smoothness | Stable regulation → smoother transitions, less modulation |
| **Complexity** | Harmonic richness | Higher complexity → more overtones/harmonics |
| **Color Balance** | Timbral warmth | Balanced colors → warmer, richer carrier tone |

This creates an *auditory mirror* of the biofield state—users hear their bioenergetic pattern.

---

## 3. System Architecture

### 3.1 High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Existing Pipeline (unchanged)                                    │
│                                                                    │
│  Camera → Canvas → MetricsCalculator → ScoreCalculator            │
│                                          │                        │
│                                    CompositeScores                │
│                                    (every ~500ms)                 │
└──────────────────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Audio Entrainment System (NEW)                                   │
│                                                                    │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐  │
│  │  Parameter   │    │  Audio       │    │  Web Audio Graph    │  │
│  │  Mapper      │───▶│  Smoother    │───▶│  (AudioContext)     │  │
│  │              │    │  (500ms EMA) │    │                     │  │
│  └─────────────┘    └──────────────┘    │  Osc L ──┐          │  │
│        ▲                                 │  Osc R ──┤─▶ Gain  │  │
│        │                                 │  Iso   ──┘   │     │  │
│  CompositeScores                        │          Analyser   │  │
│  + SessionMode                          │               │     │  │
│  + UserPrefs                            │          destination│  │
│                                          └─────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  useAudioEntrainment() — React Hook                         │  │
│  │  • Owns AudioContext lifecycle                               │  │
│  │  • Reads scores from useRealTimeMetrics or AppContext        │  │
│  │  • Exposes: play / pause / setVolume / setMode / state      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Module Structure

```
frontend/src/
├── audio/
│   ├── index.ts                      # Public API barrel export
│   ├── AudioEntrainmentEngine.ts     # Core engine (AudioContext, node graph)
│   ├── ParameterMapper.ts            # CompositeScores → AudioParameters
│   ├── ParameterSmoother.ts          # EMA smoothing for jitter-free transitions
│   ├── constants.ts                  # Frequency bands, defaults, limits
│   └── types.ts                      # All audio-related TypeScript interfaces
├── hooks/
│   └── useAudioEntrainment.ts        # React hook wrapping the engine
├── components/
│   └── AudioControls/
│       ├── index.tsx                  # Audio control panel component
│       ├── FrequencyIndicator.tsx     # Current beat frequency visual
│       └── WaveformVisualizer.tsx     # Optional AnalyserNode visualization
```

### 3.3 Dependency Graph

```
useAudioEntrainment (hook)
  ├── AudioEntrainmentEngine (class — owns AudioContext)
  │     ├── ParameterMapper (pure function module)
  │     │     └── constants (frequency bands, mapping tables)
  │     └── ParameterSmoother (class — EMA state)
  ├── useRealTimeMetrics (existing hook — score source)
  └── useBiofieldSettings (existing hook — user prefs)
```

**Design Decision:** The engine is a *class* (not a hook) because `AudioContext` is a long-lived stateful resource with imperative lifecycle methods (`suspend`, `resume`, `close`). The hook wraps the class for React integration. This matches the existing pattern where `PIPRenderer` (class) is wrapped by `usePIPRenderer` (hook).

---

## 4. Web Audio API Design

### 4.1 Audio Node Graph

```
                    ┌───────────────┐
                    │ OscillatorNode│──── Left Channel (carrier freq)
                    │  (sine wave)  │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐     ┌──────────────┐
                    │ ChannelMerger │────▶│  GainNode    │──┐
                    │  (2 → stereo) │     │  (master vol)│  │
                    └───────▲───────┘     └──────────────┘  │
                            │                                │
                    ┌───────┴───────┐     ┌──────────────┐  │
                    │ OscillatorNode│     │ AnalyserNode │◀─┘
                    │  (sine wave)  │     │  (optional)  │
                    │  Right Channel│     └──────┬───────┘
                    │ (carrier+beat)│            │
                    └───────────────┘     ┌──────▼───────┐
                                          │ destination  │
                    ┌───────────────┐     │  (speakers)  │
                    │ OscillatorNode│     └──────────────┘
                    │ (isochronal)  │            ▲
                    └───────┬───────┘            │
                    ┌───────▼───────┐            │
                    │  GainNode     │────────────┘
                    │ (pulse gate)  │
                    └───────────────┘
```

### 4.2 AudioContext Lifecycle

```typescript
class AudioEntrainmentEngine {
  private ctx: AudioContext | null = null;
  private state: EngineState = 'idle';  // idle | starting | running | suspended | disposed

  /**
   * Create AudioContext lazily on first user gesture.
   * Browser autoplay policies require user interaction before AudioContext
   * can produce sound. We create in 'suspended' state, then resume on play().
   */
  async initialize(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext({
      sampleRate: 44100,        // Standard sample rate — sufficient for entrainment
      latencyHint: 'playback',  // Optimize for smooth playback, not low latency
    });

    // AudioContext may start in 'suspended' state (autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.state = 'suspended';
    }

    this.buildNodeGraph();
    this.state = 'starting';
  }

  /**
   * Resume audio — MUST be called from a user gesture (click/tap handler).
   */
  async play(): Promise<void> {
    if (!this.ctx) await this.initialize();
    if (this.ctx!.state === 'suspended') {
      await this.ctx!.resume();
    }
    this.startOscillators();
    this.state = 'running';
  }

  /**
   * Pause audio — suspends AudioContext (stops CPU usage).
   */
  async pause(): Promise<void> {
    if (this.ctx?.state === 'running') {
      await this.ctx.suspend();
      this.state = 'suspended';
    }
  }

  /**
   * Dispose — full cleanup. Call on component unmount.
   */
  async dispose(): Promise<void> {
    this.stopOscillators();
    if (this.ctx?.state !== 'closed') {
      await this.ctx?.close();
    }
    this.ctx = null;
    this.state = 'disposed';
  }
}
```

### 4.3 Node Graph Construction

```typescript
private buildNodeGraph(): void {
  const ctx = this.ctx!;

  // --- Binaural beat oscillators ---
  this.oscLeft = ctx.createOscillator();
  this.oscRight = ctx.createOscillator();
  this.oscLeft.type = 'sine';
  this.oscRight.type = 'sine';

  // Gain nodes for individual channel control
  this.gainLeft = ctx.createGain();
  this.gainRight = ctx.createGain();
  this.oscLeft.connect(this.gainLeft);
  this.oscRight.connect(this.gainRight);

  // Channel merger for stereo separation (critical for binaural beats)
  this.merger = ctx.createChannelMerger(2);
  this.gainLeft.connect(this.merger, 0, 0);   // Left osc  → Left channel
  this.gainRight.connect(this.merger, 0, 1);  // Right osc → Right channel

  // --- Isochronal tone oscillator ---
  this.oscIso = ctx.createOscillator();
  this.oscIso.type = 'sine';
  this.gainIso = ctx.createGain();
  this.gainIso.gain.value = 0; // Starts silent; pulsed via scheduling
  this.oscIso.connect(this.gainIso);

  // --- Master volume ---
  this.masterGain = ctx.createGain();
  this.masterGain.gain.value = 0.3; // Safe default (30%)
  this.merger.connect(this.masterGain);
  this.gainIso.connect(this.masterGain);

  // --- Optional analyser for visualization ---
  this.analyser = ctx.createAnalyser();
  this.analyser.fftSize = 256;
  this.analyser.smoothingTimeConstant = 0.8;
  this.masterGain.connect(this.analyser);
  this.analyser.connect(ctx.destination);
}
```

### 4.4 Binaural Beat Frequency Control

```typescript
/**
 * Update the binaural beat parameters with smooth transitions.
 * Uses AudioParam.exponentialRampToValueAtTime for glitch-free changes.
 *
 * @param carrierHz  - Base frequency (e.g., 200 Hz)
 * @param beatHz     - Target beat frequency (e.g., 10 Hz for alpha)
 * @param rampTimeSec - Transition duration (default 0.5s)
 */
updateBinauralBeat(carrierHz: number, beatHz: number, rampTimeSec = 0.5): void {
  const now = this.ctx!.currentTime;
  const target = now + rampTimeSec;

  // Left ear: pure carrier
  this.oscLeft.frequency.setValueAtTime(this.oscLeft.frequency.value, now);
  this.oscLeft.frequency.linearRampToValueAtTime(carrierHz, target);

  // Right ear: carrier + beat frequency offset
  this.oscRight.frequency.setValueAtTime(this.oscRight.frequency.value, now);
  this.oscRight.frequency.linearRampToValueAtTime(carrierHz + beatHz, target);
}
```

### 4.5 Isochronal Tone Pulsing

```typescript
/**
 * Schedule isochronal pulses at the target beat frequency.
 * Uses gain node automation for precise timing without main-thread involvement.
 *
 * Pulse shape: smooth on/off ramps to avoid clicks.
 * Duty cycle: 50% (on for half the period, off for half).
 */
scheduleIsochronalPulses(beatHz: number, durationSec: number): void {
  const ctx = this.ctx!;
  const period = 1 / beatHz;
  const halfPeriod = period / 2;
  const ramp = Math.min(0.01, halfPeriod * 0.1); // 10% of half-period or 10ms max
  const startTime = ctx.currentTime;

  // Clear any previously scheduled values
  this.gainIso.gain.cancelScheduledValues(startTime);

  for (let t = startTime; t < startTime + durationSec; t += period) {
    // Ramp up
    this.gainIso.gain.setValueAtTime(0, t);
    this.gainIso.gain.linearRampToValueAtTime(this.isoVolume, t + ramp);
    // Hold
    this.gainIso.gain.setValueAtTime(this.isoVolume, t + halfPeriod - ramp);
    // Ramp down
    this.gainIso.gain.linearRampToValueAtTime(0, t + halfPeriod);
  }
}
```

### 4.6 Harmonic Enrichment (Complexity Mapping)

```typescript
/**
 * Add harmonics to the carrier for richer timbre.
 * Complexity score controls how many harmonics are present.
 *
 * @param complexity - 0–100 score from CompositeScores
 */
updateHarmonics(complexity: number): void {
  // Map complexity 0–100 → 0–4 additional harmonics
  const harmonicCount = Math.round((complexity / 100) * 4);

  // Remove excess harmonic oscillators
  while (this.harmonicOscs.length > harmonicCount) {
    const osc = this.harmonicOscs.pop()!;
    osc.stop();
    osc.disconnect();
  }

  // Add needed harmonic oscillators
  const baseFreq = this.currentCarrierHz;
  while (this.harmonicOscs.length < harmonicCount) {
    const n = this.harmonicOscs.length + 2; // 2nd, 3rd, 4th, 5th harmonic
    const osc = this.ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq * n;

    const gain = this.ctx!.createGain();
    gain.gain.value = 0.15 / n; // Decreasing amplitude for higher harmonics

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    this.harmonicOscs.push(osc);
    this.harmonicGains.push(gain);
  }
}
```

---

## 5. Metric-to-Audio Mapping

### 5.1 Mapping Table

| CompositeScore | Range | Audio Parameter | Audio Range | Mapping Function |
|---------------|-------|----------------|-------------|-----------------|
| **coherence** | 0–100 | Beat frequency | 30 → 2 Hz | Inverse linear: `beatHz = 30 - (coherence/100) * 28` |
| **energy** | 0–100 | Master volume | 0.05 → 0.60 | Linear: `vol = 0.05 + (energy/100) * 0.55` |
| **symmetry** | 0–100 | Stereo balance | -1.0 → +1.0 (centered at 50) | `pan = (symmetry - 50) / 50` then clamp |
| **regulation** | 0–100 | Transition smoothness | 2.0 → 0.2 sec | Inverse: `ramp = 2.0 - (regulation/100) * 1.8` |
| **complexity** | 0–100 | Harmonic count | 0 → 4 harmonics | Stepped: `Math.round(complexity / 25)` |
| **colorBalance** | 0–100 | Carrier frequency | 150 → 300 Hz | Linear: `carrier = 150 + (colorBalance/100) * 150` |

### 5.2 Coherence → Beat Frequency (Primary Mapping)

This is the most important mapping. Coherence reflects the ordered regularity of the biofield—higher coherence suggests a more organized energetic state. We map this inversely to beat frequency so that:

- **Low coherence (0–30)** → Fast beats (30–20 Hz, Beta/Gamma) — energizing, stimulating
- **Medium coherence (30–70)** → Medium beats (20–8 Hz, Alpha/Beta) — balanced, alert
- **High coherence (70–100)** → Slow beats (8–2 Hz, Theta/Delta) — deep, meditative

```typescript
function coherenceToBeatHz(coherence: number, mode: SessionMode): number {
  // Clamp to 0–100
  const c = Math.max(0, Math.min(100, coherence));

  // Mode-specific target ranges
  const ranges: Record<SessionMode, { minHz: number; maxHz: number }> = {
    relaxation:      { minHz: 8,  maxHz: 13 },  // Alpha band
    focus:           { minHz: 13, maxHz: 25 },   // Beta band
    deepMeditation:  { minHz: 2,  maxHz: 8 },    // Theta/Delta band
    freeResponse:    { minHz: 2,  maxHz: 30 },   // Full range
  };

  const { minHz, maxHz } = ranges[mode];

  // Inverse mapping: higher coherence → lower (slower) beat frequency
  // within the mode's target range
  return maxHz - (c / 100) * (maxHz - minHz);
}
```

### 5.3 Energy → Volume

Energy reflects the overall vitality of the biofield. Higher energy → more audio presence, but always capped at safe levels.

```typescript
function energyToVolume(energy: number, userMaxVolume: number): number {
  const e = Math.max(0, Math.min(100, energy));
  const baseVolume = 0.05 + (e / 100) * 0.55;  // 5% to 60%
  return Math.min(baseVolume, userMaxVolume);     // Never exceed user preference
}
```

### 5.4 Symmetry → Stereo Balance

Symmetry reflects left/right balance of the biofield. A perfectly symmetric biofield centers the audio; asymmetry pans the audio to mirror the stronger side.

```typescript
function symmetryToStereoPan(symmetry: number): number {
  // symmetry = 50 → centered (pan = 0)
  // symmetry > 50 → slight right emphasis (pan > 0)
  // symmetry < 50 → slight left emphasis (pan < 0)
  // Range is attenuated: max ±0.4 to keep sound comfortable
  const raw = (symmetry - 50) / 50;  // -1 to +1
  return Math.max(-0.4, Math.min(0.4, raw * 0.4));
}
```

### 5.5 Complete ParameterMapper

```typescript
// audio/ParameterMapper.ts

import { CompositeScores } from '../types';
import { AudioParameters, SessionMode } from './types';
import { FREQUENCY_BANDS, CARRIER_RANGE, VOLUME_RANGE } from './constants';

export function mapScoresToAudioParams(
  scores: CompositeScores,
  mode: SessionMode,
  userPrefs: AudioUserPreferences
): AudioParameters {
  const beatHz = coherenceToBeatHz(scores.coherence, mode);
  const carrierHz = 150 + (scores.colorBalance / 100) * 150;
  const volume = energyToVolume(scores.energy, userPrefs.maxVolume);
  const stereoPan = symmetryToStereoPan(scores.symmetry);
  const rampTimeSec = 2.0 - (scores.regulation / 100) * 1.8;
  const harmonicCount = Math.round(scores.complexity / 25);

  return {
    carrierHz,
    beatHz,
    volume,
    stereoPan,
    rampTimeSec,
    harmonicCount,
    isochronalEnabled: userPrefs.enableIsochronal,
    isochronalVolume: volume * 0.3, // Isochronal at 30% of main volume
  };
}
```

---

## 6. Brainwave Frequency Bands

### 6.1 Band Definitions

| Band | Frequency Range | Associated State | Entrainment Goal |
|------|----------------|-----------------|------------------|
| **Delta** | 0.5 – 4 Hz | Deep sleep, unconscious healing | Deep restorative sessions |
| **Theta** | 4 – 8 Hz | Deep meditation, creativity, REM sleep | Meditation, insight |
| **Alpha** | 8 – 13 Hz | Relaxed awareness, calm focus | Relaxation, stress relief |
| **Beta** | 13 – 30 Hz | Active thinking, concentration, alertness | Focus, productivity |
| **Gamma** | 30 – 100 Hz | Higher cognition, peak awareness | Peak performance (advanced) |

### 6.2 Constants Definition

```typescript
// audio/constants.ts

export const FREQUENCY_BANDS = {
  delta: { min: 0.5, max: 4,   label: 'Delta',  description: 'Deep sleep & healing' },
  theta: { min: 4,   max: 8,   label: 'Theta',  description: 'Meditation & creativity' },
  alpha: { min: 8,   max: 13,  label: 'Alpha',  description: 'Relaxed awareness' },
  beta:  { min: 13,  max: 30,  label: 'Beta',   description: 'Focus & concentration' },
  gamma: { min: 30,  max: 100, label: 'Gamma',  description: 'Peak cognition' },
} as const;

export const CARRIER_RANGE = {
  min: 100,   // Hz — below 100 Hz is felt more than heard
  max: 400,   // Hz — above 400 Hz, binaural beat perception weakens
  default: 200,
} as const;

export const VOLUME_RANGE = {
  min: 0.0,
  max: 0.8,    // Never full volume — entrainment tones should be gentle
  default: 0.3,
  step: 0.05,
} as const;

export const UPDATE_INTERVAL_MS = 500;   // Match existing metric update rate
export const SMOOTHING_ALPHA = 0.3;       // Match existing score smoothing
export const MAX_RAMP_TIME_SEC = 2.0;
export const MIN_RAMP_TIME_SEC = 0.1;
export const ISOCHRONAL_DUTY_CYCLE = 0.5; // 50% on / 50% off
export const MAX_HARMONICS = 4;

export type FrequencyBandName = keyof typeof FREQUENCY_BANDS;
```

### 6.3 Band Detection Utility

```typescript
/**
 * Determine which brainwave band a given beat frequency falls into.
 */
export function detectBand(beatHz: number): FrequencyBandName | null {
  if (beatHz >= 0.5 && beatHz < 4) return 'delta';
  if (beatHz >= 4 && beatHz < 8) return 'theta';
  if (beatHz >= 8 && beatHz < 13) return 'alpha';
  if (beatHz >= 13 && beatHz < 30) return 'beta';
  if (beatHz >= 30 && beatHz <= 100) return 'gamma';
  return null;
}
```

---

## 7. Session Modes

### 7.1 Mode Definitions

```typescript
export type SessionMode = 'relaxation' | 'focus' | 'deepMeditation' | 'freeResponse';

export interface SessionModeConfig {
  label: string;
  description: string;
  targetBand: FrequencyBandName;
  beatRange: { min: number; max: number };
  carrierHz: number;
  defaultVolume: number;
  isochronalEnabled: boolean;
  icon: string;  // Lucide icon name
}

export const SESSION_MODES: Record<SessionMode, SessionModeConfig> = {
  relaxation: {
    label: 'Relaxation',
    description: 'Alpha waves for calm, relaxed awareness',
    targetBand: 'alpha',
    beatRange: { min: 8, max: 13 },
    carrierHz: 200,
    defaultVolume: 0.25,
    isochronalEnabled: false,
    icon: 'Waves',
  },
  focus: {
    label: 'Focus',
    description: 'Beta waves for concentration and alertness',
    targetBand: 'beta',
    beatRange: { min: 13, max: 25 },
    carrierHz: 250,
    defaultVolume: 0.30,
    isochronalEnabled: false,
    icon: 'Target',
  },
  deepMeditation: {
    label: 'Deep Meditation',
    description: 'Theta waves for deep meditative states',
    targetBand: 'theta',
    beatRange: { min: 4, max: 8 },
    carrierHz: 180,
    defaultVolume: 0.20,
    isochronalEnabled: true,  // Isochronal helps deepen entrainment
    icon: 'Moon',
  },
  freeResponse: {
    label: 'Free Response',
    description: 'Audio mirrors your biofield across all bands',
    targetBand: 'alpha',  // Fallback center
    beatRange: { min: 2, max: 30 },
    carrierHz: 200,
    defaultVolume: 0.25,
    isochronalEnabled: false,
    icon: 'AudioLines',
  },
};
```

### 7.2 Mode Behavior

| Mode | Beat Frequency Behavior | Volume Behavior | Special |
|------|------------------------|----------------|---------|
| **Relaxation** | Constrained to 8–13 Hz; coherence pulls toward lower alpha | Gentle (0.20–0.35) | Warm carrier tone |
| **Focus** | Constrained to 13–25 Hz; coherence modulates within beta | Moderate (0.25–0.45) | Slightly brighter carrier |
| **Deep Meditation** | Constrained to 4–8 Hz; coherence deepens toward low theta | Soft (0.15–0.30) | Isochronal pulses added |
| **Free Response** | Full 2–30 Hz range; direct coherence mapping | Follows energy score | Full harmonic mapping |

---

## 8. React Hook API — `useAudioEntrainment`

### 8.1 Hook Interface

```typescript
// hooks/useAudioEntrainment.ts

export interface UseAudioEntrainmentOptions {
  /** Real-time composite scores (updates every ~500ms) */
  scores: CompositeScores | null;
  /** Session mode controlling target brainwave band */
  mode?: SessionMode;
  /** Enable/disable the audio system */
  enabled?: boolean;
  /** User audio preferences */
  preferences?: Partial<AudioUserPreferences>;
}

export interface UseAudioEntrainmentReturn {
  /** Current engine state */
  state: EngineState;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Start audio playback (must be called from user gesture) */
  play: () => Promise<void>;
  /** Pause audio playback */
  pause: () => Promise<void>;
  /** Toggle play/pause */
  toggle: () => Promise<void>;
  /** Set master volume (0.0 – 1.0) */
  setVolume: (volume: number) => void;
  /** Change session mode */
  setMode: (mode: SessionMode) => void;
  /** Current audio parameters being applied */
  currentParams: AudioParameters | null;
  /** Current detected brainwave band */
  currentBand: FrequencyBandName | null;
  /** Current beat frequency in Hz */
  currentBeatHz: number;
  /** Frequency data for visualization (from AnalyserNode) */
  frequencyData: Uint8Array | null;
  /** Whether Web Audio API is supported */
  isSupported: boolean;
  /** Error state */
  error: string | null;
}
```

### 8.2 Hook Implementation

```typescript
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AudioEntrainmentEngine } from '../audio/AudioEntrainmentEngine';
import { mapScoresToAudioParams } from '../audio/ParameterMapper';
import { ParameterSmoother } from '../audio/ParameterSmoother';
import { detectBand, UPDATE_INTERVAL_MS, SMOOTHING_ALPHA } from '../audio/constants';
import type {
  AudioParameters, SessionMode, EngineState,
  FrequencyBandName, AudioUserPreferences
} from '../audio/types';
import type { CompositeScores } from '../types';

const DEFAULT_PREFS: AudioUserPreferences = {
  maxVolume: 0.6,
  enableIsochronal: false,
  enableHarmonics: true,
  carrierType: 'sine',
};

export function useAudioEntrainment(
  options: UseAudioEntrainmentOptions
): UseAudioEntrainmentReturn {
  const {
    scores,
    mode = 'relaxation',
    enabled = true,
    preferences = {},
  } = options;

  const engineRef = useRef<AudioEntrainmentEngine | null>(null);
  const smootherRef = useRef(new ParameterSmoother(SMOOTHING_ALPHA));
  const updateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<EngineState>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentParams, setCurrentParams] = useState<AudioParameters | null>(null);
  const [currentBand, setCurrentBand] = useState<FrequencyBandName | null>(null);
  const [currentBeatHz, setCurrentBeatHz] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Merge user preferences with defaults
  const userPrefs = useMemo(
    () => ({ ...DEFAULT_PREFS, ...preferences }),
    [preferences]
  );

  // Check Web Audio API support
  const isSupported = useMemo(
    () => typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    []
  );

  // Initialize engine (lazy — does NOT create AudioContext yet)
  useEffect(() => {
    if (!isSupported || !enabled) return;

    engineRef.current = new AudioEntrainmentEngine();

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [isSupported, enabled]);

  // Score → Audio parameter update loop
  useEffect(() => {
    if (!isPlaying || !scores || !engineRef.current) return;

    const update = () => {
      const rawParams = mapScoresToAudioParams(scores, mode, userPrefs);
      const smoothedParams = smootherRef.current.smooth(rawParams);

      engineRef.current?.applyParameters(smoothedParams);
      setCurrentParams(smoothedParams);
      setCurrentBeatHz(smoothedParams.beatHz);
      setCurrentBand(detectBand(smoothedParams.beatHz));

      // Read frequency data for visualization
      const data = engineRef.current?.getFrequencyData();
      if (data) setFrequencyData(data);
    };

    updateTimerRef.current = setInterval(update, UPDATE_INTERVAL_MS);
    update(); // Immediate first update

    return () => {
      if (updateTimerRef.current) clearInterval(updateTimerRef.current);
    };
  }, [isPlaying, scores, mode, userPrefs]);

  // --- Controls ---

  const play = useCallback(async () => {
    if (!engineRef.current || !isSupported) return;
    try {
      await engineRef.current.initialize();
      await engineRef.current.play();
      setIsPlaying(true);
      setState('running');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start audio');
      setState('idle');
    }
  }, [isSupported]);

  const pause = useCallback(async () => {
    if (!engineRef.current) return;
    await engineRef.current.pause();
    setIsPlaying(false);
    setState('suspended');
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((volume: number) => {
    engineRef.current?.setMasterVolume(volume);
  }, []);

  const setMode = useCallback((_mode: SessionMode) => {
    // Mode change is handled via the options prop; this is for imperative use
    smootherRef.current.reset(); // Reset smoother on mode change for faster transition
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearInterval(updateTimerRef.current);
      engineRef.current?.dispose();
    };
  }, []);

  return {
    state,
    isPlaying,
    play,
    pause,
    toggle,
    setVolume,
    setMode,
    currentParams,
    currentBand,
    currentBeatHz,
    frequencyData,
    isSupported,
    error,
  };
}
```

### 8.3 Usage Example

```tsx
// In a component (e.g., Dashboard or session view)
import { useAudioEntrainment } from '../hooks/useAudioEntrainment';
import { useRealTimeMetrics } from '../hooks/useRealTimeMetrics';

function SessionView({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const { compositeScores } = useRealTimeMetrics(canvasRef);
  const [sessionMode, setSessionMode] = useState<SessionMode>('relaxation');

  const audio = useAudioEntrainment({
    scores: compositeScores,
    mode: sessionMode,
    enabled: true,
  });

  return (
    <div>
      {/* Audio must be started by user gesture */}
      <button onClick={audio.toggle}>
        {audio.isPlaying ? 'Pause Audio' : 'Start Entrainment'}
      </button>

      {audio.isPlaying && (
        <div>
          <span>Band: {audio.currentBand}</span>
          <span>Beat: {audio.currentBeatHz.toFixed(1)} Hz</span>
          <input
            type="range"
            min={0} max={0.8} step={0.05}
            onChange={(e) => audio.setVolume(Number(e.target.value))}
          />
        </div>
      )}

      {audio.error && <p className="text-red-500">{audio.error}</p>}
      {!audio.isSupported && <p>Audio entrainment requires Web Audio API support.</p>}
    </div>
  );
}
```

---

## 9. Session-Responsive Feedback Loop

### 9.1 Update Cycle

```
Every 500ms:
┌──────────────────────────────────────────────────────────────┐
│ 1. Read latest CompositeScores from useRealTimeMetrics       │
│ 2. mapScoresToAudioParams(scores, mode, prefs)               │
│ 3. ParameterSmoother.smooth(rawParams) — EMA filter          │
│ 4. AudioEntrainmentEngine.applyParameters(smoothedParams)    │
│    └─ Uses AudioParam.linearRampToValueAtTime()              │
│       for glitch-free transitions                            │
│ 5. Update React state (currentBand, currentBeatHz, etc.)     │
│ 6. UI re-renders frequency indicator                         │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 ParameterSmoother

Exponential Moving Average (EMA) smoother prevents jarring audio transitions when scores fluctuate rapidly. Uses the same α=0.3 as the existing score smoother for consistency.

```typescript
// audio/ParameterSmoother.ts

export class ParameterSmoother {
  private alpha: number;
  private prev: AudioParameters | null = null;

  constructor(alpha = 0.3) {
    this.alpha = alpha;
  }

  smooth(params: AudioParameters): AudioParameters {
    if (!this.prev) {
      this.prev = { ...params };
      return params;
    }

    const smoothed: AudioParameters = {
      carrierHz:         this.ema(this.prev.carrierHz, params.carrierHz),
      beatHz:            this.ema(this.prev.beatHz, params.beatHz),
      volume:            this.ema(this.prev.volume, params.volume),
      stereoPan:         this.ema(this.prev.stereoPan, params.stereoPan),
      rampTimeSec:       this.ema(this.prev.rampTimeSec, params.rampTimeSec),
      harmonicCount:     Math.round(this.ema(this.prev.harmonicCount, params.harmonicCount)),
      isochronalEnabled: params.isochronalEnabled,
      isochronalVolume:  this.ema(this.prev.isochronalVolume, params.isochronalVolume),
    };

    this.prev = { ...smoothed };
    return smoothed;
  }

  reset(): void {
    this.prev = null;
  }

  private ema(prev: number, next: number): number {
    return prev + this.alpha * (next - prev);
  }
}
```

### 9.3 Feedback Loop Dynamics

The system creates a virtuous feedback cycle:

```
User's biofield state
        │
        ▼
  CompositeScores computed
        │
        ▼
  Audio parameters mapped
        │
        ▼
  Binaural beats / isochronal tones generated
        │
        ▼
  User perceives audio (conscious + subconscious)
        │
        ▼
  Brainwave entrainment occurs (over 3–10 minutes)
        │
        ▼
  User's biofield state shifts toward target
        │
        └───────── cycle repeats ──────────┘
```

**Key timing considerations:**
- Brainwave entrainment takes **3–10 minutes** to establish
- Audio updates every **500ms** (2 Hz) — smooth enough, not distracting
- Score smoothing (α=0.3) means ~70% of old value retained each update
- The system is designed for **gentle guidance**, not forceful driving

### 9.4 Adaptive Sensitivity

As a session progresses and the user's state stabilizes, the system can reduce sensitivity to prevent micro-fluctuations from causing audible changes:

```typescript
/**
 * Adaptive smoothing: as session duration increases,
 * increase the smoothing factor to reduce jitter.
 *
 * First 2 min: α = 0.3 (responsive)
 * 2–10 min:    α = 0.2 (moderate)
 * 10+ min:     α = 0.1 (very smooth, stable)
 */
function getAdaptiveAlpha(sessionDurationSec: number): number {
  if (sessionDurationSec < 120) return 0.3;
  if (sessionDurationSec < 600) return 0.2;
  return 0.1;
}
```

---

## 10. UI Components

### 10.1 Audio Control Panel

Minimal, non-intrusive controls that integrate with the existing glassmorphic design:

```
┌──────────────────────────────────────────────┐
│  🔊 Entrainment Audio                    ⚙️  │
│                                               │
│  [ ▶ Play ]   [ Relaxation ▾ ]               │
│                                               │
│  Volume: ──────●──────────── 30%             │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Beat: 10.2 Hz  •  Alpha Band          │  │
│  │  ████████████░░░░░░  (8–13 Hz range)   │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  ☐ Isochronal tones   ☐ Harmonics           │
└──────────────────────────────────────────────┘
```

### 10.2 Component Props

```typescript
interface AudioControlPanelProps {
  audio: UseAudioEntrainmentReturn;
  mode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  className?: string;
}

interface FrequencyIndicatorProps {
  beatHz: number;
  band: FrequencyBandName | null;
  targetRange: { min: number; max: number };
}

interface WaveformVisualizerProps {
  frequencyData: Uint8Array | null;
  isPlaying: boolean;
  width?: number;
  height?: number;
}
```

### 10.3 Header Integration

Add a small audio indicator to the existing header (alongside FPS/resolution badges):

```
[Biofield Mirror]  ● Live  |  FPS: 15  |  🔊 Alpha 10Hz  |  [⚙️] [👤]
```

---

## 11. Performance & Constraints

### 11.1 Thread Architecture

```
┌─────────────────────────────────────────────────────┐
│  Main Thread (React)                                 │
│  • UI rendering, state management                    │
│  • useAudioEntrainment hook (500ms timer)            │
│  • mapScoresToAudioParams (< 0.1ms, pure functions)  │
│  • ParameterSmoother.smooth (< 0.01ms, simple EMA)  │
└─────────────────────────────────────────────────────┘
         │
         │ AudioParam.setValueAtTime() calls
         │ (schedules changes on audio thread)
         ▼
┌─────────────────────────────────────────────────────┐
│  Audio Rendering Thread (Web Audio)                  │
│  • OscillatorNode signal generation                  │
│  • GainNode volume automation                        │
│  • ChannelMerger stereo processing                   │
│  • AnalyserNode FFT computation                      │
│  • Runs independently at audio sample rate (44.1kHz) │
│  • Zero impact on main thread frame processing       │
└─────────────────────────────────────────────────────┘
         │
         │ Existing (unchanged)
         ▼
┌─────────────────────────────────────────────────────┐
│  Metrics Web Worker                                  │
│  • Pixel-level metric extraction                     │
│  • Runs independently, unaffected by audio system    │
└─────────────────────────────────────────────────────┘
```

**Performance budget for audio system on main thread:**
- `mapScoresToAudioParams()`: < 0.1ms per call (pure arithmetic)
- `ParameterSmoother.smooth()`: < 0.01ms per call (6 EMA operations)
- `setInterval` callback: < 1ms total every 500ms
- **Total main thread impact: < 0.2% CPU at 2 Hz update rate**

### 11.2 Memory Budget

| Resource | Memory | Notes |
|----------|--------|-------|
| AudioContext | ~2 MB | Browser-managed, includes render buffers |
| OscillatorNodes (2 binaural + 1 iso) | ~10 KB | Minimal per-node overhead |
| Harmonic oscillators (0–4) | ~20 KB | Dynamic, created/destroyed |
| AnalyserNode (FFT 256) | ~4 KB | Single FFT buffer |
| ParameterSmoother state | ~200 B | 8 floats |
| **Total** | **~2.1 MB** | Negligible vs. video/ML pipeline |

### 11.3 Graceful Degradation

```typescript
// Capability detection and fallback chain
function getAudioCapability(): 'full' | 'basic' | 'none' {
  // Full: AudioContext + stereo panning + AnalyserNode
  if (typeof AudioContext !== 'undefined') return 'full';

  // Basic: webkitAudioContext (older Safari)
  if (typeof (window as any).webkitAudioContext !== 'undefined') return 'basic';

  // None: no Web Audio API (very rare in modern browsers)
  return 'none';
}

// When capability is 'basic':
// - Skip AnalyserNode visualization
// - Use simpler stereo routing
// - Isochronal tones only (no true binaural stereo separation guarantee)

// When capability is 'none':
// - Hide all audio UI
// - Log informational message
// - App functions normally without audio
```

### 11.4 Autoplay Policy Handling

Modern browsers block `AudioContext` from producing sound until a user gesture:

```typescript
/**
 * Ensure AudioContext is running. Returns true if audio can play.
 * Must be called from within a user gesture handler (click, tap, keypress).
 */
async function ensureAudioContextResumed(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === 'running') return true;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      return ctx.state === 'running';
    } catch {
      return false;
    }
  }

  return false;
}
```

**UI implication:** The "Play" button must be a real `<button>` with an `onClick` handler. Audio cannot auto-start when scores become available.

---

## 12. Tauri Desktop Considerations

### 12.1 Current State

The Tauri configuration at `frontend/src-tauri/tauri.conf.json` currently has:
- **CSP:** `null` (no Content Security Policy restrictions)
- **Capabilities:** `["core:default"]` only
- **No audio-specific permissions** configured

### 12.2 Required Changes

Web Audio API runs entirely in the webview (Chromium on Windows/Linux, WebKit on macOS) and does **not** require additional Tauri permissions. However, we should consider:

```jsonc
// frontend/src-tauri/capabilities/default.json
// No changes needed for basic Web Audio API usage.
// Web Audio runs in the webview's JavaScript context.

// If we later add file-based audio (loading .wav/.mp3 presets):
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default"
    // Future: "fs:read" for loading audio preset files from app bundle
  ]
}
```

### 12.3 Platform-Specific Notes

| Platform | WebView Engine | Web Audio Support | Notes |
|----------|---------------|-------------------|-------|
| **macOS** | WebKit (WKWebView) | ✅ Full | AudioContext works, stereo separation confirmed |
| **Windows** | WebView2 (Chromium) | ✅ Full | Same as Chrome, no restrictions |
| **Linux** | WebKitGTK | ✅ Full | Requires PulseAudio or PipeWire audio backend |

### 12.4 Background Audio

When the Tauri window loses focus:
- **macOS/Windows:** WebView continues executing JavaScript and audio plays
- **Linux:** Same behavior, but power management may throttle background apps

No special handling needed — `AudioContext` continues running when the window is blurred, unlike mobile browsers.

---

## 13. TypeScript Interfaces

### 13.1 Complete Type Definitions

```typescript
// audio/types.ts

import { FrequencyBandName } from './constants';

// ─── Engine State ────────────────────────────────────────────

export type EngineState = 'idle' | 'starting' | 'running' | 'suspended' | 'disposed';

// ─── Session Mode ────────────────────────────────────────────

export type SessionMode = 'relaxation' | 'focus' | 'deepMeditation' | 'freeResponse';

// ─── Audio Parameters (output of mapping function) ───────────

export interface AudioParameters {
  /** Carrier/base frequency in Hz (100–400) */
  carrierHz: number;
  /** Binaural beat frequency in Hz (0.5–100) */
  beatHz: number;
  /** Master volume (0.0–1.0) */
  volume: number;
  /** Stereo pan position (-1.0 left to +1.0 right) */
  stereoPan: number;
  /** Transition ramp time in seconds */
  rampTimeSec: number;
  /** Number of harmonic overtones (0–4) */
  harmonicCount: number;
  /** Whether isochronal tones are active */
  isochronalEnabled: boolean;
  /** Isochronal tone volume (0.0–1.0) */
  isochronalVolume: number;
}

// ─── User Preferences ────────────────────────────────────────

export interface AudioUserPreferences {
  /** Maximum volume cap (0.0–1.0, default 0.6) */
  maxVolume: number;
  /** Enable isochronal tones alongside binaural beats */
  enableIsochronal: boolean;
  /** Enable harmonic overtones for richer timbre */
  enableHarmonics: boolean;
  /** Carrier waveform type */
  carrierType: OscillatorType;  // 'sine' | 'triangle' | 'sawtooth' | 'square'
}

// ─── Audio State (exposed to UI) ─────────────────────────────

export interface AudioEntrainmentState {
  /** Current engine lifecycle state */
  engineState: EngineState;
  /** Whether audio is actively producing sound */
  isPlaying: boolean;
  /** Current applied parameters (after smoothing) */
  currentParams: AudioParameters | null;
  /** Detected brainwave band for current beat frequency */
  currentBand: FrequencyBandName | null;
  /** Current beat frequency in Hz */
  currentBeatHz: number;
  /** Session elapsed time in seconds */
  sessionDurationSec: number;
  /** FFT frequency data for visualization (AnalyserNode output) */
  frequencyData: Uint8Array | null;
  /** Whether Web Audio API is available */
  isSupported: boolean;
  /** Error message if something went wrong */
  error: string | null;
}

// ─── Engine Configuration ────────────────────────────────────

export interface AudioEngineConfig {
  /** Audio sample rate (default: 44100) */
  sampleRate: number;
  /** FFT size for AnalyserNode (default: 256) */
  fftSize: number;
  /** AnalyserNode smoothing (default: 0.8) */
  smoothingTimeConstant: number;
  /** Latency hint for AudioContext */
  latencyHint: AudioContextLatencyCategory;
}

// ─── Events (for optional event bus integration) ─────────────

export type AudioEntrainmentEvent =
  | { type: 'stateChange'; state: EngineState }
  | { type: 'bandChange'; from: FrequencyBandName | null; to: FrequencyBandName | null }
  | { type: 'error'; message: string }
  | { type: 'parameterUpdate'; params: AudioParameters };
```

### 13.2 Integration with Existing Types

```typescript
// These already exist in frontend/src/types/index.ts — referenced, not duplicated:

export interface CompositeScores {
  energy: number;      // 0–100
  symmetry: number;    // 0–100
  coherence: number;   // 0–100
  complexity: number;  // 0–100
  regulation: number;  // 0–100
  colorBalance: number; // 0–100
}
```

### 13.3 AppContext Integration

Extend the existing `AppState` to include audio state:

```typescript
// Addition to context/appState.ts

interface AppState {
  // ... existing fields ...

  // Audio entrainment (NEW)
  audioMode: SessionMode;
  audioEnabled: boolean;
}

// New action types:
| { type: 'SET_AUDIO_MODE'; payload: SessionMode }
| { type: 'SET_AUDIO_ENABLED'; payload: boolean }
```

---

## 14. Implementation Plan

### Phase 1: Core Engine (3–4 days) `[P]`

| # | Task | Deps | Acceptance Criteria |
|---|------|------|-------------------|
| 1.1 | Create `audio/types.ts` with all interfaces | None | Types compile, exported from barrel |
| 1.2 | Create `audio/constants.ts` with frequency bands, ranges, mode configs | None | All constants defined, `detectBand()` works |
| 1.3 | Implement `ParameterMapper.mapScoresToAudioParams()` | 1.1, 1.2 | Given scores + mode → correct AudioParameters |
| 1.4 | Implement `ParameterSmoother` class | 1.1 | EMA smoothing works, reset works, edge cases handled |
| 1.5 | Implement `AudioEntrainmentEngine` class | 1.1, 1.2 | Full lifecycle: init → play → update → pause → dispose |
| 1.6 | Unit tests for mapper, smoother, band detection | 1.3, 1.4 | 90%+ coverage on pure functions |

`[P]` Tasks 1.1–1.4 can be parallelized (no shared state).

### Phase 2: React Integration (2–3 days)

| # | Task | Deps | Acceptance Criteria |
|---|------|------|-------------------|
| 2.1 | Implement `useAudioEntrainment` hook | Phase 1 | Hook lifecycle correct, cleanup on unmount |
| 2.2 | Add `audioMode` / `audioEnabled` to `AppState` | None | Reducer handles new actions, persists in settings |
| 2.3 | Integration test: scores → hook → engine | 2.1 | Scores flow through, parameters update |
| 2.4 | Autoplay policy handling + error states | 2.1 | Graceful handling in Chrome, Safari, Firefox |

### Phase 3: UI Components (2–3 days) `[P]`

| # | Task | Deps | Acceptance Criteria |
|---|------|------|-------------------|
| 3.1 | `AudioControls` panel component | Phase 2 | Play/pause, volume, mode selector |
| 3.2 | `FrequencyIndicator` component | Phase 2 | Shows current beat Hz + band name + range bar |
| 3.3 | `WaveformVisualizer` component (optional) | Phase 2 | Canvas-based FFT visualization from AnalyserNode |
| 3.4 | Header audio indicator integration | 3.1 | Small icon + beat frequency in header bar |
| 3.5 | Settings page audio preferences | 2.2 | Max volume, carrier type, isochronal toggle |

`[P]` Tasks 3.1–3.3 can be parallelized.

### Phase 4: Polish & Testing (2 days)

| # | Task | Deps | Acceptance Criteria |
|---|------|------|-------------------|
| 4.1 | Cross-browser testing (Chrome, Safari, Firefox) | Phase 3 | Audio plays correctly on all browsers |
| 4.2 | Tauri desktop testing (macOS) | Phase 3 | Audio works in Tauri webview |
| 4.3 | Performance profiling | Phase 3 | < 0.5% main thread CPU added |
| 4.4 | Accessibility: keyboard controls, screen reader labels | 3.1 | WCAG 2.1 AA for audio controls |
| 4.5 | Documentation + usage guide | Phase 3 | README section + inline JSDoc |

**Total estimated: 9–12 days**

---

## 15. Testing Strategy

### 15.1 Unit Tests (Vitest)

```typescript
// __tests__/audio/ParameterMapper.test.ts

describe('mapScoresToAudioParams', () => {
  it('maps high coherence to low beat frequency in relaxation mode', () => {
    const scores: CompositeScores = {
      energy: 50, symmetry: 50, coherence: 90,
      complexity: 50, regulation: 50, colorBalance: 50,
    };
    const params = mapScoresToAudioParams(scores, 'relaxation', DEFAULT_PREFS);
    expect(params.beatHz).toBeGreaterThanOrEqual(8);
    expect(params.beatHz).toBeLessThanOrEqual(9); // Low end of alpha
  });

  it('clamps volume to user maxVolume', () => {
    const scores: CompositeScores = {
      energy: 100, symmetry: 50, coherence: 50,
      complexity: 50, regulation: 50, colorBalance: 50,
    };
    const prefs = { ...DEFAULT_PREFS, maxVolume: 0.4 };
    const params = mapScoresToAudioParams(scores, 'relaxation', prefs);
    expect(params.volume).toBeLessThanOrEqual(0.4);
  });

  it('centers stereo pan when symmetry is 50', () => {
    const scores: CompositeScores = {
      energy: 50, symmetry: 50, coherence: 50,
      complexity: 50, regulation: 50, colorBalance: 50,
    };
    const params = mapScoresToAudioParams(scores, 'relaxation', DEFAULT_PREFS);
    expect(params.stereoPan).toBeCloseTo(0, 2);
  });
});

describe('ParameterSmoother', () => {
  it('returns raw params on first call', () => {
    const smoother = new ParameterSmoother(0.3);
    const params = makeTestParams({ beatHz: 10 });
    expect(smoother.smooth(params).beatHz).toBe(10);
  });

  it('smooths toward new values with alpha weight', () => {
    const smoother = new ParameterSmoother(0.3);
    smoother.smooth(makeTestParams({ beatHz: 10 }));
    const result = smoother.smooth(makeTestParams({ beatHz: 20 }));
    // EMA: 10 + 0.3 * (20 - 10) = 13
    expect(result.beatHz).toBeCloseTo(13, 1);
  });

  it('resets to uninitialized state', () => {
    const smoother = new ParameterSmoother(0.3);
    smoother.smooth(makeTestParams({ beatHz: 10 }));
    smoother.reset();
    const result = smoother.smooth(makeTestParams({ beatHz: 20 }));
    expect(result.beatHz).toBe(20); // No smoothing after reset
  });
});

describe('detectBand', () => {
  it.each([
    [2, 'delta'], [6, 'theta'], [10, 'alpha'], [20, 'beta'], [40, 'gamma'],
  ])('detects %d Hz as %s band', (hz, expected) => {
    expect(detectBand(hz)).toBe(expected);
  });

  it('returns null for out-of-range frequencies', () => {
    expect(detectBand(0.1)).toBeNull();
    expect(detectBand(150)).toBeNull();
  });
});
```

### 15.2 Integration Tests

```typescript
// __tests__/audio/AudioEntrainmentEngine.integration.test.ts

describe('AudioEntrainmentEngine', () => {
  // Note: Vitest runs in JSDOM which does NOT support Web Audio API.
  // Use a mock AudioContext or skip in CI, test manually in browser.

  it('transitions through lifecycle states correctly', async () => {
    const engine = new AudioEntrainmentEngine();
    expect(engine.getState()).toBe('idle');

    await engine.initialize();
    expect(engine.getState()).toMatch(/starting|suspended/);

    await engine.play();
    expect(engine.getState()).toBe('running');

    await engine.pause();
    expect(engine.getState()).toBe('suspended');

    await engine.dispose();
    expect(engine.getState()).toBe('disposed');
  });
});
```

### 15.3 Testing Considerations

- **JSDOM limitation:** Web Audio API is not available in JSDOM (Vitest default). Options:
  1. Mock `AudioContext` for unit tests (recommended for CI)
  2. Use `@vitest/browser` for real browser tests (slower but accurate)
  3. Manual testing in dev server for audio quality verification
- **Pure functions are primary test targets:** `ParameterMapper`, `ParameterSmoother`, `detectBand`, and constants are fully testable without Web Audio
- **Hook testing:** Use `@testing-library/react` with mocked engine

---

## 16. Appendix — References

### 16.1 Web Audio API Documentation
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN: AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- [MDN: OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
- [MDN: AudioParam.linearRampToValueAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime)

### 16.2 Brainwave Entrainment Research
- Huang, T. L., & Charyton, C. (2008). A comprehensive review of the psychological effects of brainwave entrainment. *Alternative Therapies in Health and Medicine*, 14(5), 38–50.
- Oster, G. (1973). Auditory beats in the brain. *Scientific American*, 229(4), 94–102.

### 16.3 Existing Codebase References
- `PIP_Analysis_System_Specification.md` § 10 — Original entrainment concept
- `frontend/src/types/index.ts` — `RealTimeMetrics` and `CompositeScores` interfaces
- `frontend/src/hooks/useRealTimeMetrics.ts` — Score computation pipeline
- `frontend/src/services/ScoreCalculator.ts` — Composite score formulas
- `frontend/src/hooks/usePIPRenderer.ts` — Pattern for class-wrapped-in-hook
- `frontend/src/context/appState.ts` — AppState reducer pattern

### 16.4 Design Decisions Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| No external audio library | Web Audio API native | Zero deps, sufficient for synthesis, no bundle bloat |
| Class engine + hook wrapper | Matches `PIPRenderer` pattern | Imperative `AudioContext` lifecycle fits class model |
| EMA smoothing (α=0.3) | Matches existing score smoother | Consistent feel; proven in existing metric pipeline |
| 500ms update interval | Matches existing metric rate | Natural sync; no faster data available |
| Carrier range 100–400 Hz | Optimal binaural beat perception | Literature consensus: above 1kHz degrades beat perception |
| Max volume 0.8 | Safety cap | Entrainment tones should be gentle background audio |
| Inverse coherence → beat Hz | High coherence = slower beats | Reflects ordered state → deeper brainwave bands |

---

*End of specification.*
