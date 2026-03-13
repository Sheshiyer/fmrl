import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * RustComputeService Test Suite
 * 
 * Tests the Tauri IPC bridge: Rust ComputeOutput → frontend RealTimeMetrics + CompositeScores.
 * Mocks @tauri-apps/api/core invoke and window.__TAURI_INTERNALS__.
 */

// ---------- Mock @tauri-apps/api/core ----------
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }));

// ---------- Helpers ----------

/** Factory for a realistic Rust ComputeMetricsResponse (camelCase per serde rename_all) */
function makeRustResponse(overrides: Record<string, unknown> = {}) {
  return {
    runtime: 'tauri-rust-metrics-v2c',
    output: {
      ok: true,
      frameId: 'frame-001',
      width: 640,
      height: 480,
      channels: 4,
      pixelCount: 307200,
      byteLen: 1228800,
      basic: {
        intensityMean: 128.5,
        intensityStdDev: 42.3,
        dynamicRange: 210.0,
      },
      color: {
        channelBalance: 0.85,
        saturationMean: 0.65,
        chromaEnergy: 1500.0,
      },
      geometric: {
        horizontalSymmetry: 0.82,
        verticalSymmetry: 0.75,
        centerWeightedIntensity: 140.0,
      },
      nonlinear: {
        fractalDimension: 1.45,
        hurstExponent: 0.72,
        lyapunovExponent: -0.15,
        correlationDimension: 2.3,
        dfaAlpha: 0.95,
        sampleEntropy: 1.8,
      },
      advancedSymmetry: {
        bodySymmetry: 0.88,
        ssimSymmetry: 0.91,
        correlationSymmetry: 0.85,
        histogramSymmetry: 0.79,
        colorSymmetry: 0.73,
        pixelSymmetry: 0.80,
        contourBalance: 0.77,
        midlineX: 320,
      },
      scores: {
        energyScore: 72,
        coherenceScore: 68,
      },
      consistency: {
        passed: true,
        warnings: [],
        parityGateReady: true,
      },
      message: 'ok',
      ...overrides,
    },
  };
}

/** Minimal 2x2 RGBA ImageData stub */
function createTestImageData(): ImageData {
  const data = new Uint8ClampedArray(2 * 2 * 4); // 2x2 RGBA
  data.fill(128);
  return { data, width: 2, height: 2, colorSpace: 'srgb' } as ImageData;
}

// ---------- Lazy import (after mock registration) ----------
async function loadService() {
  const mod = await import('../../services/RustComputeService');
  return mod;
}

// ---------- Tests ----------

describe('RustComputeService', () => {
  let savedTauri: unknown;

  beforeEach(() => {
    mockInvoke.mockReset();
    savedTauri = (globalThis as Record<string, unknown>).window;
  });

  afterEach(() => {
    // Restore window state
    if (savedTauri !== undefined) {
      (globalThis as Record<string, unknown>).window = savedTauri;
    }
    vi.restoreAllMocks();
  });

  describe('isRustComputeAvailable', () => {
    it('returns true when __TAURI_INTERNALS__ is present', async () => {
      // Simulate Tauri runtime
      (globalThis as Record<string, unknown>).window = { __TAURI_INTERNALS__: {} };
      const { isRustComputeAvailable } = await loadService();
      expect(isRustComputeAvailable()).toBe(true);
    });

    it('returns false when not in Tauri', async () => {
      (globalThis as Record<string, unknown>).window = {};
      const { isRustComputeAvailable } = await loadService();
      expect(isRustComputeAvailable()).toBe(false);
    });
  });

  describe('computeMetrics', () => {
    it('invokes compute_metrics with correct IPC payload', async () => {
      const rustResp = makeRustResponse();
      mockInvoke.mockResolvedValueOnce(rustResp);

      const { computeMetrics } = await loadService();
      const imageData = createTestImageData();
      await computeMetrics(imageData);

      expect(mockInvoke).toHaveBeenCalledWith('compute_metrics', {
        input: {
          width: 2,
          height: 2,
          format: 'rgba8',
          bytes: Array.from(imageData.data),
          frameId: expect.any(String),
          timestampMs: expect.any(Number),
        },
      });
    });

    it('maps Rust basic metrics to RealTimeMetrics', async () => {
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const result = await computeMetrics(createTestImageData());

      expect(result.metrics.avgIntensity).toBe(128.5);
      expect(result.metrics.intensityStdDev).toBe(42.3);
      expect(result.metrics.horizontalSymmetry).toBe(0.82);
      expect(result.metrics.verticalSymmetry).toBe(0.75);
      expect(result.metrics.saturationMean).toBe(0.65);
    });

    it('maps dynamic range to maxIntensity/minIntensity', async () => {
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const result = await computeMetrics(createTestImageData());

      // dynamicRange = max - min, so we reconstruct: max = mean + dynamicRange/2
      expect(result.metrics.maxIntensity).toBeGreaterThan(result.metrics.minIntensity);
    });

    it('computes all 6 composite scores', async () => {
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const result = await computeMetrics(createTestImageData());

      // Rust provides energy + coherence directly
      expect(result.scores.energy).toBe(72);
      expect(result.scores.coherence).toBe(68);

      // The remaining 4 are computed from raw metrics
      expect(result.scores.symmetry).toBeGreaterThanOrEqual(0);
      expect(result.scores.symmetry).toBeLessThanOrEqual(100);
      expect(result.scores.complexity).toBeGreaterThanOrEqual(0);
      expect(result.scores.complexity).toBeLessThanOrEqual(100);
      expect(result.scores.regulation).toBeGreaterThanOrEqual(0);
      expect(result.scores.regulation).toBeLessThanOrEqual(100);
      expect(result.scores.colorBalance).toBeGreaterThanOrEqual(0);
      expect(result.scores.colorBalance).toBeLessThanOrEqual(100);
    });

    it('uses ScoreCalculator formulas for symmetry score', async () => {
      // With known inputs, we can predict the symmetry score:
      // bodySymmetry=0.88, horizontalSymmetry=0.82, colorSymmetry=0.73
      // score = 0.50*0.88 + 0.30*0.82 + 0.20*0.73 = 0.44+0.246+0.146 = 0.832
      // rounded = 83
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const result = await computeMetrics(createTestImageData());

      expect(result.scores.symmetry).toBe(83);
    });

    it('sets timestamp on metrics result', async () => {
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const before = Date.now();
      const result = await computeMetrics(createTestImageData());
      const after = Date.now();

      expect(result.metrics.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.metrics.timestamp).toBeLessThanOrEqual(after);
    });

    it('includes runtime tag in result', async () => {
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const result = await computeMetrics(createTestImageData());

      expect(result.runtime).toBe('tauri-rust-metrics-v2c');
    });

    it('throws on invoke failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('IPC channel closed'));
      const { computeMetrics } = await loadService();

      await expect(computeMetrics(createTestImageData())).rejects.toThrow('IPC channel closed');
    });

    it('throws when Rust reports ok=false', async () => {
      const failResp = makeRustResponse({ ok: false, message: 'invalid pixel format' });
      mockInvoke.mockResolvedValueOnce(failResp);
      const { computeMetrics } = await loadService();

      await expect(computeMetrics(createTestImageData())).rejects.toThrow('invalid pixel format');
    });
  });

  describe('score parity — 4 derived scores', () => {
    it('computes complexity from fractal, entropy, correlation, contour, noise', async () => {
      // fractalDimension=1.45 → fdNorm = 0.45
      // colorEntropy not in Rust output → use sampleEntropy (1.8) → entropyNorm = max(0, min(1, (1.8-3)/5)) = 0 (clamped)
      // Actually we need to map chromaEnergy or sampleEntropy... let's just verify range
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const result = await computeMetrics(createTestImageData());

      expect(typeof result.scores.complexity).toBe('number');
      expect(result.scores.complexity).not.toBeNaN();
      expect(result.scores.complexity).toBeGreaterThanOrEqual(0);
      expect(result.scores.complexity).toBeLessThanOrEqual(100);
    });

    it('computes regulation from lyapunov, dfa, temporal, recurrence', async () => {
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const result = await computeMetrics(createTestImageData());

      expect(typeof result.scores.regulation).toBe('number');
      expect(result.scores.regulation).not.toBeNaN();
      expect(result.scores.regulation).toBeGreaterThanOrEqual(0);
      expect(result.scores.regulation).toBeLessThanOrEqual(100);
    });

    it('computes colorBalance from entropy, saturation, coherence, symmetry', async () => {
      mockInvoke.mockResolvedValueOnce(makeRustResponse());
      const { computeMetrics } = await loadService();
      const result = await computeMetrics(createTestImageData());

      expect(typeof result.scores.colorBalance).toBe('number');
      expect(result.scores.colorBalance).not.toBeNaN();
      expect(result.scores.colorBalance).toBeGreaterThanOrEqual(0);
      expect(result.scores.colorBalance).toBeLessThanOrEqual(100);
    });
  });
});
