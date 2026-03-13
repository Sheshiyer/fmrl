import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ComputeRouter Test Suite
 *
 * Verifies routing: Tauri → Rust path, Browser → JS path.
 */

// ---------- Mocks ----------
const mockComputeMetrics = vi.fn();
const mockIsRustAvailable = vi.fn();

vi.mock('../../services/RustComputeService', () => ({
  computeMetrics: mockComputeMetrics,
  isRustComputeAvailable: mockIsRustAvailable,
}));

const mockCalculateFromImageData = vi.fn();
vi.mock('../../services/MetricsCalculator', () => {
  // Must use `function` (not arrow) so it can be called with `new`
  function MockMetricsCalculator() {
    return { calculateFromImageData: mockCalculateFromImageData };
  }
  return { MetricsCalculator: MockMetricsCalculator };
});

const mockCalculateAll = vi.fn();
vi.mock('../../services/ScoreCalculator', () => ({
  ScoreCalculator: vi.fn().mockImplementation(() => ({
    calculateAll: mockCalculateAll,
  })),
  scoreCalculator: { calculateAll: mockCalculateAll },
}));

// ---------- Helpers ----------

function createTestImageData(): ImageData {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  data.fill(100);
  return { data, width: 4, height: 4, colorSpace: 'srgb' } as ImageData;
}

const fakeRustResult = {
  metrics: {
    timestamp: Date.now(),
    avgIntensity: 128,
    intensityStdDev: 40,
    maxIntensity: 240,
    minIntensity: 30,
    lightQuantaDensity: 0.5,
    normalizedArea: 0.8,
    innerNoise: 10,
    innerNoisePercent: 5,
    horizontalSymmetry: 0.85,
    verticalSymmetry: 0.78,
    dominantHue: 180,
    saturationMean: 0.6,
    colorEntropy: 5.2,
    frameToFrameChange: 0,
  },
  scores: {
    energy: 72,
    symmetry: 83,
    coherence: 68,
    complexity: 45,
    regulation: 55,
    colorBalance: 60,
  },
  runtime: 'tauri-rust-metrics-v2c',
};

const fakeJsMetrics = {
  timestamp: Date.now(),
  avgIntensity: 130,
  intensityStdDev: 38,
  maxIntensity: 235,
  minIntensity: 25,
  lightQuantaDensity: 0.48,
  normalizedArea: 0.75,
  innerNoise: 12,
  innerNoisePercent: 6,
  horizontalSymmetry: 0.80,
  verticalSymmetry: 0.73,
  dominantHue: 175,
  saturationMean: 0.58,
  colorEntropy: 4.9,
  frameToFrameChange: 0.02,
};

const fakeJsScores = {
  energy: 65,
  symmetry: 78,
  coherence: 62,
  complexity: 40,
  regulation: 50,
  colorBalance: 55,
};

// ---------- Lazy import ----------
async function loadRouter() {
  const mod = await import('../../services/ComputeRouter');
  return mod;
}

// ---------- Tests ----------

describe('ComputeRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when Tauri runtime is available', () => {
    it('routes to RustComputeService', async () => {
      mockIsRustAvailable.mockReturnValue(true);
      mockComputeMetrics.mockResolvedValueOnce(fakeRustResult);

      const { computeFrame } = await loadRouter();
      const result = await computeFrame(createTestImageData());

      expect(mockComputeMetrics).toHaveBeenCalledTimes(1);
      expect(result.metrics.avgIntensity).toBe(128);
      expect(result.scores.energy).toBe(72);
      expect(result.route).toBe('rust');
    });

    it('falls back to JS on Rust failure', async () => {
      mockIsRustAvailable.mockReturnValue(true);
      mockComputeMetrics.mockRejectedValueOnce(new Error('IPC timeout'));
      mockCalculateFromImageData.mockReturnValue(fakeJsMetrics);
      mockCalculateAll.mockReturnValue(fakeJsScores);

      const { computeFrame } = await loadRouter();
      const result = await computeFrame(createTestImageData());

      expect(result.route).toBe('js-fallback');
      expect(result.scores.energy).toBe(65);
    });
  });

  describe('when Tauri runtime is NOT available', () => {
    it('routes to JS MetricsCalculator + ScoreCalculator', async () => {
      mockIsRustAvailable.mockReturnValue(false);
      mockCalculateFromImageData.mockReturnValue(fakeJsMetrics);
      mockCalculateAll.mockReturnValue(fakeJsScores);

      const { computeFrame } = await loadRouter();
      const result = await computeFrame(createTestImageData());

      expect(mockComputeMetrics).not.toHaveBeenCalled();
      expect(mockCalculateFromImageData).toHaveBeenCalledTimes(1);
      expect(result.metrics.avgIntensity).toBe(130);
      expect(result.scores.energy).toBe(65);
      expect(result.route).toBe('js');
    });
  });

  describe('result shape', () => {
    it('always returns metrics + scores + route', async () => {
      mockIsRustAvailable.mockReturnValue(false);
      mockCalculateFromImageData.mockReturnValue(fakeJsMetrics);
      mockCalculateAll.mockReturnValue(fakeJsScores);

      const { computeFrame } = await loadRouter();
      const result = await computeFrame(createTestImageData());

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('route');
      expect(['rust', 'js', 'js-fallback']).toContain(result.route);
    });
  });
});
