/**
 * ComputeRouter — Routes frame computation to Rust (via Tauri IPC)
 * or falls back to the JS MetricsCalculator + ScoreCalculator.
 *
 * Usage:
 *   const result = await computeFrame(imageData);
 *   // result.route === 'rust' | 'js' | 'js-fallback'
 */

import type { RealTimeMetrics, CompositeScores } from '../types';
import { isRustComputeAvailable, computeMetrics as rustCompute } from './RustComputeService';
import { MetricsCalculator } from './MetricsCalculator';
import { scoreCalculator } from './ScoreCalculator';

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export type ComputeRoute = 'rust' | 'js' | 'js-fallback';

export interface ComputeFrameResult {
  metrics: RealTimeMetrics;
  scores: CompositeScores;
  route: ComputeRoute;
}

// ---------------------------------------------------------------------------
// JS fallback calculator (singleton)
// ---------------------------------------------------------------------------

const jsCalculator = new MetricsCalculator();

function computeViaJs(imageData: ImageData): ComputeFrameResult {
  const frameMetrics = jsCalculator.calculateFromImageData(imageData);

  const metrics: RealTimeMetrics = {
    timestamp: Date.now(),
    avgIntensity: frameMetrics.avgIntensity,
    intensityStdDev: frameMetrics.intensityStdDev,
    maxIntensity: frameMetrics.maxIntensity,
    minIntensity: frameMetrics.minIntensity,
    lightQuantaDensity: frameMetrics.lightQuantaDensity,
    normalizedArea: frameMetrics.normalizedArea,
    innerNoise: frameMetrics.innerNoise,
    innerNoisePercent: frameMetrics.innerNoisePercent,
    horizontalSymmetry: frameMetrics.horizontalSymmetry,
    verticalSymmetry: frameMetrics.verticalSymmetry,
    dominantHue: frameMetrics.dominantHue,
    saturationMean: frameMetrics.saturationMean,
    colorEntropy: frameMetrics.colorEntropy,
    frameToFrameChange: frameMetrics.frameToFrameChange,
  };

  const scores = scoreCalculator.calculateAll({
    avgIntensity: metrics.avgIntensity,
    intensityStdDev: metrics.intensityStdDev,
    lightQuantaDensity: metrics.lightQuantaDensity,
    normalizedArea: metrics.normalizedArea,
    innerNoise: metrics.innerNoise,
    innerNoisePercent: metrics.innerNoisePercent,
    horizontalSymmetry: metrics.horizontalSymmetry,
    verticalSymmetry: metrics.verticalSymmetry,
    saturationMean: metrics.saturationMean,
    colorEntropy: metrics.colorEntropy,
  });

  return { metrics, scores, route: 'js' };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function computeFrame(imageData: ImageData): Promise<ComputeFrameResult> {
  if (!isRustComputeAvailable()) {
    return computeViaJs(imageData);
  }

  try {
    const result = await rustCompute(imageData);
    if (import.meta.env.DEV) {
      console.debug('[ComputeRouter] Rust path used:', result.runtime);
    }
    return { metrics: result.metrics, scores: result.scores, route: 'rust' };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[ComputeRouter] Rust compute failed, falling back to JS:', err);
    }
    const fallback = computeViaJs(imageData);
    return { ...fallback, route: 'js-fallback' };
  }
}
