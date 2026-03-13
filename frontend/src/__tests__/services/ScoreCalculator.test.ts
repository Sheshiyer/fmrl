import { describe, it, expect, beforeEach } from 'vitest'
import { ScoreCalculator, MetricsInput } from '../../services/ScoreCalculator'

describe('ScoreCalculator', () => {
  let calc: ScoreCalculator

  beforeEach(() => {
    calc = new ScoreCalculator()
  })

  describe('calculateAll', () => {
    it('returns all 6 composite scores', () => {
      const scores = calc.calculateAll({})
      expect(scores).toHaveProperty('energy')
      expect(scores).toHaveProperty('symmetry')
      expect(scores).toHaveProperty('coherence')
      expect(scores).toHaveProperty('complexity')
      expect(scores).toHaveProperty('regulation')
      expect(scores).toHaveProperty('colorBalance')
    })

    it('returns raw scores on first call (no smoothing)', () => {
      const input: MetricsInput = {
        lightQuantaDensity: 0.5,
        avgIntensity: 128,
        normalizedArea: 0.75,
      }
      const first = calc.calculateAll(input)
      expect(first.energy).toBe(calc.calculateEnergyScore(input))
    })

    it('applies exponential smoothing on second call', () => {
      const input1: MetricsInput = { avgIntensity: 100 }
      const input2: MetricsInput = { avgIntensity: 200 }

      const first = calc.calculateAll(input1)
      const second = calc.calculateAll(input2)

      // Smoothed = 0.3 * raw + 0.7 * prev → should be closer to first
      const rawSecond = new ScoreCalculator().calculateAll(input2)
      expect(Math.abs(second.energy - first.energy)).toBeLessThan(
        Math.abs(rawSecond.energy - first.energy)
      )
    })

    it('reset() clears smoothing state', () => {
      calc.calculateAll({ avgIntensity: 100 })
      calc.reset()
      const input: MetricsInput = { avgIntensity: 200 }
      const afterReset = calc.calculateAll(input)
      const fresh = new ScoreCalculator().calculateAll(input)
      expect(afterReset.energy).toBe(fresh.energy)
    })
  })

  describe('calculateEnergyScore', () => {
    it('returns 0–100 range', () => {
      const score = calc.calculateEnergyScore({
        lightQuantaDensity: 0.5,
        avgIntensity: 128,
        energy: 5000,
        pixelCount: 100,
        normalizedArea: 0.8,
      })
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('returns higher score for higher LQD', () => {
      const low = calc.calculateEnergyScore({ lightQuantaDensity: 0.1 })
      const high = calc.calculateEnergyScore({ lightQuantaDensity: 0.9 })
      expect(high).toBeGreaterThan(low)
    })

    it('never returns NaN', () => {
      const score = calc.calculateEnergyScore({
        lightQuantaDensity: NaN,
        avgIntensity: NaN,
      })
      expect(score).not.toBeNaN()
    })

    it('handles empty input with defaults', () => {
      const score = calc.calculateEnergyScore({})
      expect(score).toBe(0) // all defaults are 0 → weighted sum is 0
    })

    it('clamps LQD above 1 to 1', () => {
      const capped = calc.calculateEnergyScore({ lightQuantaDensity: 5 })
      const atOne = calc.calculateEnergyScore({ lightQuantaDensity: 1 })
      expect(capped).toBe(atOne)
    })
  })

  describe('calculateSymmetryScore', () => {
    it('returns 50 for default inputs (all fallbacks are 0.5)', () => {
      const score = calc.calculateSymmetryScore({})
      expect(score).toBe(50)
    })

    it('returns 100 for perfect symmetry', () => {
      const score = calc.calculateSymmetryScore({
        bodySymmetry: 1,
        horizontalSymmetry: 1,
        colorSymmetry: 1,
      })
      expect(score).toBe(100)
    })

    it('returns 0 for zero symmetry', () => {
      const score = calc.calculateSymmetryScore({
        bodySymmetry: 0,
        horizontalSymmetry: 0,
        colorSymmetry: 0,
      })
      expect(score).toBe(0)
    })

    it('uses horizontalSymmetry as fallback for bodySymmetry', () => {
      const withHorizontal = calc.calculateSymmetryScore({
        horizontalSymmetry: 0.8,
      })
      // bodySymmetry fallback → horizontalSymmetry (0.8)
      // contourBalance = horizontalSymmetry (0.8)
      // colorSymmetry = default 0.5
      const expected = Math.round((0.50 * 0.8 + 0.30 * 0.8 + 0.20 * 0.5) * 100)
      expect(withHorizontal).toBe(expected)
    })
  })

  describe('calculateCoherenceScore', () => {
    it('maps Hurst exponent 0.5→0, 1.0→1', () => {
      const atHalf = calc.calculateCoherenceScore({ hurstExponent: 0.5 })
      const atOne = calc.calculateCoherenceScore({ hurstExponent: 1.0 })
      expect(atOne).toBeGreaterThan(atHalf)
    })

    it('returns valid score with all defaults', () => {
      const score = calc.calculateCoherenceScore({})
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateComplexityScore', () => {
    it('maps fractal dimension 1.0→0, 2.0→1', () => {
      const low = calc.calculateComplexityScore({ fractalDimension: 1.0 })
      const high = calc.calculateComplexityScore({ fractalDimension: 2.0 })
      expect(high).toBeGreaterThan(low)
    })

    it('maps color entropy 3→0, 8→1', () => {
      const low = calc.calculateComplexityScore({ colorEntropy: 3 })
      const high = calc.calculateComplexityScore({ colorEntropy: 8 })
      expect(high).toBeGreaterThan(low)
    })
  })

  describe('calculateRegulationScore', () => {
    it('higher score for negative Lyapunov (stable)', () => {
      const stable = calc.calculateRegulationScore({ lyapunovExponent: -0.3 })
      const chaotic = calc.calculateRegulationScore({ lyapunovExponent: 0.3 })
      expect(stable).toBeGreaterThan(chaotic)
    })

    it('optimal DFA alpha at 1.0', () => {
      const optimal = calc.calculateRegulationScore({ dfaAlpha: 1.0 })
      const offBy = calc.calculateRegulationScore({ dfaAlpha: 0.5 })
      expect(optimal).toBeGreaterThan(offBy)
    })

    it('lower temporal variance = higher regulation', () => {
      const calm = calc.calculateRegulationScore({ temporalVariance: 0.05 })
      const noisy = calc.calculateRegulationScore({ temporalVariance: 0.25 })
      expect(calm).toBeGreaterThan(noisy)
    })
  })

  describe('calculateColorBalanceScore', () => {
    it('higher entropy = higher uniformity component', () => {
      const low = calc.calculateColorBalanceScore({ colorEntropy: 1 })
      const high = calc.calculateColorBalanceScore({ colorEntropy: 7 })
      expect(high).toBeGreaterThan(low)
    })

    it('returns valid score with defaults', () => {
      const score = calc.calculateColorBalanceScore({})
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('setSmoothingFactor', () => {
    it('clamps to [0, 1] without crash', () => {
      calc.setSmoothingFactor(-0.5)
      const scores = calc.calculateAll({ avgIntensity: 100 })
      expect(scores.energy).toBeGreaterThanOrEqual(0)

      calc.setSmoothingFactor(5)
      const scores2 = calc.calculateAll({ avgIntensity: 200 })
      expect(scores2.energy).toBeGreaterThanOrEqual(0)
    })
  })
})
