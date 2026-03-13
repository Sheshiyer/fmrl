import { describe, it, expect, beforeEach } from 'vitest'
import { MetricsCalculator } from '../../services/MetricsCalculator'

/**
 * Helper: create an ImageData-like object with uniform color
 */
function createImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData
}

/**
 * Helper: create horizontally symmetric image (left mirrors right)
 */
function createSymmetricImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  const mid = Math.floor(width / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < mid; x++) {
      const val = Math.round((x * 255) / mid)
      const leftIdx = (y * width + x) * 4
      const rightIdx = (y * width + (width - 1 - x)) * 4
      data[leftIdx] = data[rightIdx] = val
      data[leftIdx + 1] = data[rightIdx + 1] = val
      data[leftIdx + 2] = data[rightIdx + 2] = val
      data[leftIdx + 3] = data[rightIdx + 3] = 255
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData
}

describe('MetricsCalculator', () => {
  let calc: MetricsCalculator

  beforeEach(() => {
    calc = new MetricsCalculator()
  })

  describe('calculateFromImageData', () => {
    it('returns all FrameMetrics fields', () => {
      const img = createImageData(4, 4, 128, 128, 128)
      const metrics = calc.calculateFromImageData(img)

      expect(metrics).toHaveProperty('timestamp')
      expect(metrics).toHaveProperty('avgIntensity')
      expect(metrics).toHaveProperty('intensityStdDev')
      expect(metrics).toHaveProperty('maxIntensity')
      expect(metrics).toHaveProperty('minIntensity')
      expect(metrics).toHaveProperty('lightQuantaDensity')
      expect(metrics).toHaveProperty('normalizedArea')
      expect(metrics).toHaveProperty('innerNoise')
      expect(metrics).toHaveProperty('innerNoisePercent')
      expect(metrics).toHaveProperty('horizontalSymmetry')
      expect(metrics).toHaveProperty('verticalSymmetry')
      expect(metrics).toHaveProperty('dominantHue')
      expect(metrics).toHaveProperty('saturationMean')
      expect(metrics).toHaveProperty('colorEntropy')
      expect(metrics).toHaveProperty('frameToFrameChange')
    })

    it('computes correct avg intensity for uniform gray', () => {
      const img = createImageData(10, 10, 128, 128, 128)
      const metrics = calc.calculateFromImageData(img)

      expect(metrics.avgIntensity).toBeCloseTo(128, 0)
      expect(metrics.intensityStdDev).toBeCloseTo(0, 5)
      expect(metrics.maxIntensity).toBeCloseTo(128, 0)
      expect(metrics.minIntensity).toBeCloseTo(128, 0)
    })

    it('computes LQD = 0 for uniform image (no pixels above threshold)', () => {
      const img = createImageData(10, 10, 100, 100, 100)
      const metrics = calc.calculateFromImageData(img)
      expect(metrics.lightQuantaDensity).toBe(0)
    })

    it('returns normalizedArea = 1.0 without mask', () => {
      const img = createImageData(4, 4, 100, 100, 100)
      const metrics = calc.calculateFromImageData(img)
      expect(metrics.normalizedArea).toBe(1.0)
    })

    it('returns lower normalizedArea with mask', () => {
      const img = createImageData(4, 4, 100, 100, 100)
      const mask = new Uint8Array(16)
      for (let i = 0; i < 8; i++) mask[i] = 1
      const metrics = calc.calculateFromImageData(img, mask)
      expect(metrics.normalizedArea).toBe(0.5)
    })

    it('computes high horizontal symmetry for symmetric image', () => {
      const img = createSymmetricImageData(10, 10)
      const metrics = calc.calculateFromImageData(img)
      expect(metrics.horizontalSymmetry).toBeGreaterThan(0.95)
    })

    it('returns 0 frameToFrameChange on first call', () => {
      const img = createImageData(4, 4, 100, 100, 100)
      const metrics = calc.calculateFromImageData(img)
      expect(metrics.frameToFrameChange).toBe(0)
    })

    it('detects frame-to-frame change between different images', () => {
      const img1 = createImageData(4, 4, 50, 50, 50)
      const img2 = createImageData(4, 4, 200, 200, 200)

      calc.calculateFromImageData(img1)
      const metrics2 = calc.calculateFromImageData(img2)

      expect(metrics2.frameToFrameChange).toBeGreaterThan(0)
    })

    it('returns empty metrics for all-masked image', () => {
      const img = createImageData(4, 4, 100, 100, 100)
      const mask = new Uint8Array(16).fill(0)
      const metrics = calc.calculateFromImageData(img, mask)
      expect(metrics.avgIntensity).toBe(0)
    })
  })

  describe('getTemporalStability', () => {
    it('returns 1.0 with fewer than 2 frames', () => {
      expect(calc.getTemporalStability()).toBe(1.0)
    })

    it('returns ~1.0 for identical frames', () => {
      const img = createImageData(4, 4, 100, 100, 100)
      calc.calculateFromImageData(img)
      calc.calculateFromImageData(img)
      calc.calculateFromImageData(img)
      expect(calc.getTemporalStability()).toBeCloseTo(1.0, 1)
    })

    it('returns lower stability for varying frames', () => {
      const img1 = createImageData(4, 4, 50, 50, 50)
      const img2 = createImageData(4, 4, 200, 200, 200)
      calc.calculateFromImageData(img1)
      calc.calculateFromImageData(img2)
      calc.calculateFromImageData(img1)
      calc.calculateFromImageData(img2)

      const stability = calc.getTemporalStability()
      expect(stability).toBeLessThan(1.0)
      expect(stability).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getTrend', () => {
    it('returns 0 with fewer than 3 frames', () => {
      const img = createImageData(4, 4, 100, 100, 100)
      calc.calculateFromImageData(img)
      expect(calc.getTrend('avgIntensity')).toBe(0)
    })

    it('returns positive trend for increasing intensity', () => {
      for (let i = 50; i <= 200; i += 30) {
        calc.calculateFromImageData(createImageData(4, 4, i, i, i))
      }
      expect(calc.getTrend('avgIntensity')).toBeGreaterThan(0)
    })

    it('returns ~zero trend for constant intensity', () => {
      for (let i = 0; i < 5; i++) {
        calc.calculateFromImageData(createImageData(4, 4, 100, 100, 100))
      }
      expect(Math.abs(calc.getTrend('avgIntensity'))).toBeLessThan(0.01)
    })
  })

  describe('clearBuffer', () => {
    it('resets frame buffer and previous frame', () => {
      const img = createImageData(4, 4, 100, 100, 100)
      calc.calculateFromImageData(img)
      calc.calculateFromImageData(img)

      calc.clearBuffer()

      expect(calc.getTemporalStability()).toBe(1.0)
      expect(calc.getTrend('avgIntensity')).toBe(0)
      const metrics = calc.calculateFromImageData(img)
      expect(metrics.frameToFrameChange).toBe(0)
    })
  })

  describe('buffer overflow', () => {
    it('caps buffer at 30 frames', () => {
      for (let i = 0; i < 40; i++) {
        calc.calculateFromImageData(createImageData(4, 4, i * 6, i * 6, i * 6))
      }
      const trend = calc.getTrend('avgIntensity')
      expect(trend).toBeGreaterThan(0)
    })
  })

  describe('color metrics', () => {
    it('detects dominant hue for pure red', () => {
      const img = createImageData(10, 10, 255, 0, 0)
      const metrics = calc.calculateFromImageData(img)
      expect(metrics.dominantHue).toBeLessThanOrEqual(15)
    })

    it('returns zero entropy for uniform color', () => {
      const img = createImageData(10, 10, 128, 0, 0)
      const metrics = calc.calculateFromImageData(img)
      expect(metrics.colorEntropy).toBeCloseTo(0, 1)
    })

    it('returns zero saturation for gray', () => {
      const img = createImageData(10, 10, 128, 128, 128)
      const metrics = calc.calculateFromImageData(img)
      expect(metrics.saturationMean).toBeCloseTo(0, 5)
    })
  })
})
