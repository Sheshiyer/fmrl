/**
 * RustComputeService — Tauri IPC bridge to the Rust compute engine.
 *
 * Converts ImageData → Tauri invoke payload, calls the Rust `compute_metrics`
 * command, and maps the camelCase response back to frontend types.
 *
 * Score parity: Rust returns only energy_score + coherence_score. The remaining
 * four scores (symmetry, complexity, regulation, colorBalance) are derived here
 * using the exact same formulas as ScoreCalculator.ts.
 */

import { invoke } from '@tauri-apps/api/core';
import type { RealTimeMetrics, CompositeScores } from '../types';

// ---------------------------------------------------------------------------
// Rust response types (mirrors serde rename_all = "camelCase")
// ---------------------------------------------------------------------------

interface RustBasicMetrics {
  intensityMean: number;
  intensityStdDev: number;
  dynamicRange: number;
}

interface RustColorMetrics {
  channelBalance: number;
  saturationMean: number;
  chromaEnergy: number;
}

interface RustGeometricMetrics {
  horizontalSymmetry: number;
  verticalSymmetry: number;
  centerWeightedIntensity: number;
}

interface RustNonlinearMetrics {
  fractalDimension: number;
  hurstExponent: number;
  lyapunovExponent: number;
  correlationDimension: number;
  dfaAlpha: number;
  sampleEntropy: number;
}

interface RustAdvancedSymmetryMetrics {
  bodySymmetry: number;
  ssimSymmetry: number;
  correlationSymmetry: number;
  histogramSymmetry: number;
  colorSymmetry: number;
  pixelSymmetry: number;
  contourBalance: number;
  midlineX: number;
}

interface RustCompositeScores {
  energyScore: number;
  coherenceScore: number;
}

interface RustConsistencyCheck {
  passed: boolean;
  warnings: string[];
  parityGateReady: boolean;
}

interface RustComputeOutput {
  ok: boolean;
  frameId: string | null;
  width: number;
  height: number;
  channels: number;
  pixelCount: number;
  byteLen: number;
  basic: RustBasicMetrics;
  color: RustColorMetrics;
  geometric: RustGeometricMetrics;
  nonlinear: RustNonlinearMetrics;
  advancedSymmetry: RustAdvancedSymmetryMetrics;
  scores: RustCompositeScores;
  consistency: RustConsistencyCheck;
  message: string;
}

interface RustComputeMetricsResponse {
  runtime: string;
  output: RustComputeOutput;
}

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface RustComputeResult {
  metrics: RealTimeMetrics;
  scores: CompositeScores;
  runtime: string;
}

// ---------------------------------------------------------------------------
// Runtime detection
// ---------------------------------------------------------------------------

export function isRustComputeAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

// ---------------------------------------------------------------------------
// Safe number helper (matches ScoreCalculator.safeNumber)
// ---------------------------------------------------------------------------

function safe(value: number | undefined | null, fallback: number): number {
  if (value === undefined || value === null || isNaN(value)) return fallback;
  return value;
}

// ---------------------------------------------------------------------------
// Score parity: derive the 4 missing scores from Rust raw metrics
// using identical formulas from ScoreCalculator.ts
// ---------------------------------------------------------------------------

function deriveSymmetryScore(o: RustComputeOutput): number {
  const bodySymmetry = safe(o.advancedSymmetry.bodySymmetry ?? o.geometric.horizontalSymmetry, 0.5);
  const contourBalance = safe(o.geometric.horizontalSymmetry, 0.5);
  const colorSymmetry = Math.max(0, safe(o.advancedSymmetry.colorSymmetry, 0.5));
  const score = 0.50 * bodySymmetry + 0.30 * contourBalance + 0.20 * colorSymmetry;
  const result = Math.round(score * 100);
  return isNaN(result) ? 50 : result;
}

function deriveComplexityScore(o: RustComputeOutput): number {
  const fd = safe(o.nonlinear.fractalDimension, 1.5);
  const fdNorm = Math.max(0, Math.min(1, fd - 1.0));

  // Rust doesn't have colorEntropy directly; use sampleEntropy as proxy
  // (3–8 range mapping, same as ScoreCalculator)
  const entropy = safe(o.nonlinear.sampleEntropy, 5);
  const entropyNorm = Math.max(0, Math.min(1, (entropy - 3) / 5));

  const corrDim = safe(o.nonlinear.correlationDimension, 2);
  const corrDimNorm = corrDim % 1;

  // contourBalance as proxy for contourComplexity
  const contour = safe(o.advancedSymmetry.contourBalance, 1.2);
  const contourNorm = Math.max(0, Math.min(1, contour - 1.0));

  // Noise: use intensityStdDev / dynamicRange as noise proxy %
  const noisePercent = o.basic.dynamicRange > 0
    ? (o.basic.intensityStdDev / o.basic.dynamicRange) * 100
    : 20;
  const noiseNorm = Math.min(noisePercent / 50, 1);

  const score = 0.30 * fdNorm + 0.25 * entropyNorm + 0.20 * corrDimNorm + 0.15 * contourNorm + 0.10 * noiseNorm;
  const result = Math.round(score * 100);
  return isNaN(result) ? 50 : result;
}

function deriveRegulationScore(o: RustComputeOutput): number {
  const lyap = safe(o.nonlinear.lyapunovExponent, 0);
  const lyapNorm = Math.max(0, Math.min(1, 0.5 - lyap));

  const dfa = safe(o.nonlinear.dfaAlpha, 1.0);
  const dfaNorm = Math.max(0, Math.min(1, 1 - Math.abs(dfa - 1.0)));

  // No temporal variance from single-frame Rust compute → use default
  const tempVarNorm = 1 - Math.min(0.15 / 0.3, 1); // default 0.15

  // No recurrence rate from Rust → default 0.5
  const recurrence = 0.5;

  // segVarNorm: use default 0.5 (temporal stability not available per frame)
  const segVarNorm = 0.5;

  const score = 0.30 * lyapNorm + 0.25 * dfaNorm + 0.20 * tempVarNorm + 0.15 * recurrence + 0.10 * segVarNorm;
  const result = Math.round(score * 100);
  return isNaN(result) ? 50 : result;
}

function deriveColorBalanceScore(o: RustComputeOutput): number {
  // Color entropy: use sampleEntropy as proxy (0–7 → 0–1)
  const uniformity = Math.min(safe(o.nonlinear.sampleEntropy, 5) / 7, 1);

  const hueBalance = safe(o.color.saturationMean, 0.5);

  const satMean = safe(o.color.saturationMean, 0.5);
  const satConsistency = satMean > 0 ? Math.min(satMean * 2, 1) : 0.5;

  // Color coherence: use channelBalance as proxy
  const coherence = safe(o.color.channelBalance, 0.5);

  const symmetry = Math.max(0, safe(o.advancedSymmetry.colorSymmetry ?? o.geometric.horizontalSymmetry, 0.5));

  const score = 0.30 * uniformity + 0.25 * hueBalance + 0.20 * satConsistency + 0.15 * coherence + 0.10 * symmetry;
  const result = Math.round(score * 100);
  return isNaN(result) ? 50 : result;
}

// ---------------------------------------------------------------------------
// Main IPC call
// ---------------------------------------------------------------------------

let frameCounter = 0;

export async function computeMetrics(imageData: ImageData): Promise<RustComputeResult> {
  frameCounter += 1;

  const response = await invoke<RustComputeMetricsResponse>('compute_metrics', {
    input: {
      width: imageData.width,
      height: imageData.height,
      format: 'rgba8' as const,
      bytes: Array.from(imageData.data),
      frameId: `frame-${frameCounter}`,
      timestampMs: Date.now(),
    },
  });

  const o = response.output;

  if (!o.ok) {
    throw new Error(o.message || 'Rust compute_metrics returned ok=false');
  }

  // Map to RealTimeMetrics
  const metrics: RealTimeMetrics = {
    timestamp: Date.now(),
    avgIntensity: o.basic.intensityMean,
    intensityStdDev: o.basic.intensityStdDev,
    maxIntensity: Math.min(255, o.basic.intensityMean + o.basic.dynamicRange / 2),
    minIntensity: Math.max(0, o.basic.intensityMean - o.basic.dynamicRange / 2),
    lightQuantaDensity: o.basic.intensityMean / 255,
    normalizedArea: o.geometric.centerWeightedIntensity / 255,
    innerNoise: o.basic.intensityStdDev,
    innerNoisePercent: o.basic.dynamicRange > 0
      ? (o.basic.intensityStdDev / o.basic.dynamicRange) * 100
      : 0,
    horizontalSymmetry: o.geometric.horizontalSymmetry,
    verticalSymmetry: o.geometric.verticalSymmetry,
    dominantHue: 0, // Rust doesn't compute hue directly
    saturationMean: o.color.saturationMean,
    colorEntropy: o.nonlinear.sampleEntropy, // Best proxy available
    frameToFrameChange: 0, // Single-frame; no delta available
  };

  // Composite scores: 2 from Rust + 4 derived
  const scores: CompositeScores = {
    energy: o.scores.energyScore,
    coherence: o.scores.coherenceScore,
    symmetry: deriveSymmetryScore(o),
    complexity: deriveComplexityScore(o),
    regulation: deriveRegulationScore(o),
    colorBalance: deriveColorBalanceScore(o),
  };

  return { metrics, scores, runtime: response.runtime };
}
