/**
 * Score Calculator - Computes composite scores from metrics
 */
import type { CompositeScores } from '../types';

export interface MetricsInput {
  // Basic metrics
  avgIntensity?: number;
  intensityStdDev?: number;
  lightQuantaDensity?: number;
  normalizedArea?: number;
  innerNoise?: number;
  innerNoisePercent?: number;
  
  // Symmetry metrics
  horizontalSymmetry?: number;
  verticalSymmetry?: number;
  bodySymmetry?: number;
  colorSymmetry?: number;
  
  // Color metrics
  dominantHue?: number;
  saturationMean?: number;
  colorEntropy?: number;
  colorCoherence?: number;
  
  // Geometric metrics
  formCoefficient?: number;
  entropyCoefficient?: number;
  contourComplexity?: number;
  
  // Nonlinear dynamics (from backend)
  fractalDimension?: number;
  hurstExponent?: number;
  lyapunovExponent?: number;
  correlationDimension?: number;
  dfaAlpha?: number;
  
  // Temporal metrics
  temporalStability?: number;
  temporalVariance?: number;
  patternRegularity?: number;
  recurrenceRate?: number;
  
  // Energy
  energy?: number;
  pixelCount?: number;
}

export class ScoreCalculator {
  private smoothingFactor = 0.3; // For exponential smoothing
  private previousScores: CompositeScores | null = null;

  calculateAll(metrics: MetricsInput): CompositeScores {
    const rawScores: CompositeScores = {
      energy: this.calculateEnergyScore(metrics),
      symmetry: this.calculateSymmetryScore(metrics),
      coherence: this.calculateCoherenceScore(metrics),
      complexity: this.calculateComplexityScore(metrics),
      regulation: this.calculateRegulationScore(metrics),
      colorBalance: this.calculateColorBalanceScore(metrics),
    };

    // Apply smoothing if we have previous scores
    if (this.previousScores) {
      const smoothedScores: CompositeScores = {
        energy: this.smooth(rawScores.energy, this.previousScores.energy),
        symmetry: this.smooth(rawScores.symmetry, this.previousScores.symmetry),
        coherence: this.smooth(rawScores.coherence, this.previousScores.coherence),
        complexity: this.smooth(rawScores.complexity, this.previousScores.complexity),
        regulation: this.smooth(rawScores.regulation, this.previousScores.regulation),
        colorBalance: this.smooth(rawScores.colorBalance, this.previousScores.colorBalance),
      };
      this.previousScores = smoothedScores;
      return smoothedScores;
    }

    this.previousScores = rawScores;
    return rawScores;
  }

  calculateEnergyScore(metrics: MetricsInput): number {
    // Components: LQD (30%), Intensity (25%), Energy (25%), Area (20%)
    const lqd = Math.min(this.safeNumber(metrics.lightQuantaDensity, 0), 1);
    const intensity = this.safeNumber(metrics.avgIntensity, 0) / 255;

    // Normalize energy
    let energyNorm = 0;
    if (metrics.energy && metrics.pixelCount) {
      const maxEnergy = metrics.pixelCount * 255;
      energyNorm = Math.min(metrics.energy / (maxEnergy + 1), 1);
    }

    const area = Math.min(this.safeNumber(metrics.normalizedArea, 0) / 1.5, 1);

    const score = 0.30 * lqd + 0.25 * intensity + 0.25 * energyNorm + 0.20 * area;
    const result = Math.round(score * 100);
    return isNaN(result) ? 50 : result;
  }

  calculateSymmetryScore(metrics: MetricsInput): number {
    // Components: Body SSIM (50%), Contour Balance (30%), Color Symmetry (20%)
    const bodySymmetry = this.safeNumber(metrics.bodySymmetry ?? metrics.horizontalSymmetry, 0.5);

    // Use horizontal symmetry as proxy for contour balance if not available
    const contourBalance = this.safeNumber(metrics.horizontalSymmetry, 0.5);
    const colorSymmetry = Math.max(0, this.safeNumber(metrics.colorSymmetry, 0.5));

    const score = 0.50 * bodySymmetry + 0.30 * contourBalance + 0.20 * colorSymmetry;
    const result = Math.round(score * 100);
    return isNaN(result) ? 50 : result;
  }

  calculateCoherenceScore(metrics: MetricsInput): number {
    // Components: Pattern Regularity (35%), Temporal Stability (25%), Hurst (25%), Color Coherence (15%)
    const patternReg = this.safeNumber(metrics.patternRegularity, 0.5);
    const temporalStab = this.safeNumber(metrics.temporalStability, 0.5);

    // Map Hurst exponent (0.5-1.0 → 0-1)
    const hurst = this.safeNumber(metrics.hurstExponent, 0.5);
    const hurstNorm = Math.max(0, Math.min(1, (hurst - 0.5) * 2));

    const colorCoherence = this.safeNumber(metrics.colorCoherence, 0.5);

    const score = 0.35 * patternReg + 0.25 * temporalStab + 0.25 * hurstNorm + 0.15 * colorCoherence;
    const result = Math.round(score * 100);
    return isNaN(result) ? 50 : result;
  }

  calculateComplexityScore(metrics: MetricsInput): number {
    // Components: Fractal (30%), Entropy (25%), CorrDim (20%), Contour (15%), Noise (10%)

    // Map fractal dimension (1.0-2.0 → 0-1)
    const fd = this.safeNumber(metrics.fractalDimension, 1.5);
    const fdNorm = Math.max(0, Math.min(1, fd - 1.0));

    // Map color entropy (3-8 bits → 0-1)
    const entropy = this.safeNumber(metrics.colorEntropy, 5);
    const entropyNorm = Math.max(0, Math.min(1, (entropy - 3) / 5));

    // Correlation dimension fractional part
    const corrDim = this.safeNumber(metrics.correlationDimension, 2);
    const corrDimNorm = corrDim % 1;

    // Contour complexity
    const contour = this.safeNumber(metrics.contourComplexity, 1.2);
    const contourNorm = Math.max(0, Math.min(1, contour - 1.0));

    // Noise (0-50% → 0-1)
    const noiseNorm = Math.min(this.safeNumber(metrics.innerNoisePercent, 20) / 50, 1);

    const score = 0.30 * fdNorm + 0.25 * entropyNorm + 0.20 * corrDimNorm + 0.15 * contourNorm + 0.10 * noiseNorm;
    const result = Math.round(score * 100);
    return isNaN(result) ? 50 : result;
  }

  calculateRegulationScore(metrics: MetricsInput): number {
    // Components: Lyapunov (30%), DFA (25%), TempVar (20%), Recurrence (15%), SegVar (10%)

    // Lyapunov: negative = stable (-0.5 to +0.5 → 1 to 0)
    const lyap = this.safeNumber(metrics.lyapunovExponent, 0);
    const lyapNorm = Math.max(0, Math.min(1, 0.5 - lyap));

    // DFA alpha: optimal at 1.0
    const dfa = this.safeNumber(metrics.dfaAlpha, 1.0);
    const dfaNorm = Math.max(0, Math.min(1, 1 - Math.abs(dfa - 1.0)));

    // Temporal variance (inverted)
    const tempVar = this.safeNumber(metrics.temporalVariance, 0.15);
    const tempVarNorm = 1 - Math.min(tempVar / 0.3, 1);

    // Recurrence rate
    const recurrence = Math.max(0, Math.min(1, this.safeNumber(metrics.recurrenceRate, 0.5)));

    // Use temporal stability as proxy for segmented area variability
    const segVarNorm = this.safeNumber(metrics.temporalStability, 0.5);

    const score = 0.30 * lyapNorm + 0.25 * dfaNorm + 0.20 * tempVarNorm + 0.15 * recurrence + 0.10 * segVarNorm;

    // Ensure we never return NaN
    const result = Math.round(score * 100);
    return isNaN(result) ? 50 : result;
  }

  /**
   * Safely converts a value to a number, returning fallback if NaN, undefined, or null
   */
  private safeNumber(value: number | undefined | null, fallback: number): number {
    if (value === undefined || value === null || isNaN(value)) {
      return fallback;
    }
    return value;
  }

  calculateColorBalanceScore(metrics: MetricsInput): number {
    // Components: Uniformity (30%), Hue Balance (25%), Sat Consistency (20%), Coherence (15%), Symmetry (10%)

    // Color entropy as uniformity (0-7 → 0-1)
    const uniformity = Math.min(this.safeNumber(metrics.colorEntropy, 5) / 7, 1);

    // Hue balance - use saturation mean as proxy (higher = more colorful = better balance)
    const hueBalance = this.safeNumber(metrics.saturationMean, 0.5);

    // Saturation consistency (using inverse of deviation)
    const satMean = this.safeNumber(metrics.saturationMean, 0.5);
    const satConsistency = satMean > 0 ? Math.min(satMean * 2, 1) : 0.5;

    // Color coherence
    const coherence = this.safeNumber(metrics.colorCoherence, 0.5);

    // Color symmetry
    const symmetry = Math.max(0, this.safeNumber(metrics.colorSymmetry ?? metrics.horizontalSymmetry, 0.5));

    const score = 0.30 * uniformity + 0.25 * hueBalance + 0.20 * satConsistency + 0.15 * coherence + 0.10 * symmetry;
    const result = Math.round(score * 100);
    return isNaN(result) ? 50 : result;
  }

  private smooth(current: number, previous: number): number {
    return Math.round(this.smoothingFactor * current + (1 - this.smoothingFactor) * previous);
  }

  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  reset(): void {
    this.previousScores = null;
  }
}

// Singleton instance for consistent state
export const scoreCalculator = new ScoreCalculator();
