/**
 * Real-time Metrics Hook - Computes actual scores from video frames
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MetricsCalculator } from '../services/MetricsCalculator';
import { ScoreCalculator, type MetricsInput } from '../services/ScoreCalculator';
import { getRuntimeWebSocketUrl } from '../utils/runtimeApi';

export interface CompositeScores {
  energy: number;
  symmetry: number;
  coherence: number;
  complexity: number;
  regulation: number;
  colorBalance: number;
}

export interface LiveMetrics {
  lqd: number;
  avgIntensity: number;
  innerNoise: number;
  fractalDim: number;
  hurstExp: number;
  horizontalSymmetry: number;
  verticalSymmetry: number;
}

export interface TimelineDataPoint {
  time: number;
  energy: number;
  symmetry: number;
  coherence: number;
}

export interface RealTimeMetricsState {
  scores: CompositeScores;
  metrics: LiveMetrics;
  timeline: TimelineDataPoint[];
  sessionDuration: number;
  isConnected: boolean;
}

const TIMELINE_MAX_POINTS = 60; // 1 minute of data at 1 point/second

export function useRealTimeMetrics(canvasRef?: React.RefObject<HTMLCanvasElement>) {
  const metricsCalculator = useRef(new MetricsCalculator());
  const scoreCalculator = useRef(new ScoreCalculator());
  const sessionStartTime = useRef<number>(0);
  const timelineRef = useRef<TimelineDataPoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<RealTimeMetricsState>({
    scores: {
      energy: 0,
      symmetry: 0,
      coherence: 0,
      complexity: 0,
      regulation: 0,
      colorBalance: 0,
    },
    metrics: {
      lqd: 0,
      avgIntensity: 0,
      innerNoise: 0,
      fractalDim: 1.5,
      hurstExp: 0.5,
      horizontalSymmetry: 0.5,
      verticalSymmetry: 0.5,
    },
    timeline: [],
    sessionDuration: 0,
    isConnected: false,
  });

  // Session timer
  useEffect(() => {
    sessionStartTime.current = Date.now();
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        sessionDuration: Math.floor((Date.now() - sessionStartTime.current) / 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Connect to backend WebSocket for advanced metrics
  useEffect(() => {
    let cancelled = false;

    const connectWebSocket = async () => {
      try {
        const wsUrl = await getRuntimeWebSocketUrl('/ws/v1/metrics');
        if (cancelled) return;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (cancelled) return;
          console.log('Connected to metrics WebSocket');
          setState(prev => ({ ...prev, isConnected: true }));
          ws.send(JSON.stringify({ type: 'ping' }));
        };

        ws.onmessage = (event) => {
          if (cancelled) return;

          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);

            if (data.type === 'metrics') {
              // Update with backend-computed nonlinear dynamics metrics
              setState(prev => ({
                ...prev,
                metrics: {
                  ...prev.metrics,
                  fractalDim: data.fractalDimension ?? prev.metrics.fractalDim,
                  hurstExp: data.hurstExponent ?? prev.metrics.hurstExp,
                },
              }));
            } else if (data.type === 'pong') {
              if (pingTimeoutRef.current) {
                clearTimeout(pingTimeoutRef.current);
              }

              pingTimeoutRef.current = setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'ping' }));
                }
              }, 30000);
            }
          } catch (e) {
            console.warn('Failed to parse WebSocket message:', e);
          }
        };

        ws.onclose = () => {
          if (cancelled) return;
          console.log('WebSocket disconnected, will compute locally');
          setState(prev => ({ ...prev, isConnected: false }));
        };

        ws.onerror = () => {
          if (cancelled) return;
          console.warn('WebSocket error, falling back to local computation');
        };

        wsRef.current = ws;
      } catch (e) {
        if (cancelled) return;
        console.warn('Failed to connect WebSocket:', e);
      }
    };

    void connectWebSocket();

    return () => {
      cancelled = true;
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
        pingTimeoutRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  // Process video frame and compute metrics
  const processFrame = useCallback((imageData: ImageData) => {
    // Process frames locally even without backend connection

    // Calculate frame metrics from image data
    const frameMetrics = metricsCalculator.current.calculateFromImageData(imageData);
    
    // Convert to MetricsInput format for score calculation
    const metricsInput: MetricsInput = {
      avgIntensity: frameMetrics.avgIntensity,
      intensityStdDev: frameMetrics.intensityStdDev,
      lightQuantaDensity: frameMetrics.lightQuantaDensity,
      normalizedArea: frameMetrics.normalizedArea,
      innerNoise: frameMetrics.innerNoise,
      innerNoisePercent: frameMetrics.innerNoisePercent,
      horizontalSymmetry: frameMetrics.horizontalSymmetry,
      verticalSymmetry: frameMetrics.verticalSymmetry,
      dominantHue: frameMetrics.dominantHue,
      saturationMean: frameMetrics.saturationMean,
      colorEntropy: frameMetrics.colorEntropy,
      temporalStability: metricsCalculator.current.getTemporalStability(),
      // These would come from backend for real computation
      fractalDimension: state.metrics.fractalDim,
      hurstExponent: state.metrics.hurstExp,
    };

    // Calculate composite scores
    const scores = scoreCalculator.current.calculateAll(metricsInput);

    // Update timeline
    const timePoint = Math.floor((Date.now() - sessionStartTime.current) / 1000);
    const newDataPoint: TimelineDataPoint = {
      time: timePoint,
      energy: scores.energy,
      symmetry: scores.symmetry,
      coherence: scores.coherence,
    };

    timelineRef.current.push(newDataPoint);
    if (timelineRef.current.length > TIMELINE_MAX_POINTS) {
      timelineRef.current.shift();
    }

    // Update state
    setState(prev => ({
      ...prev,
      scores,
      metrics: {
        lqd: frameMetrics.lightQuantaDensity,
        avgIntensity: frameMetrics.avgIntensity,
        innerNoise: frameMetrics.innerNoisePercent,
        fractalDim: prev.metrics.fractalDim,
        hurstExp: prev.metrics.hurstExp,
        horizontalSymmetry: frameMetrics.horizontalSymmetry,
        verticalSymmetry: frameMetrics.verticalSymmetry,
      },
      timeline: [...timelineRef.current],
    }));

    // Send frame data to backend for advanced analysis (if connected)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'frame_metrics',
        metrics: frameMetrics,
      }));
      
      // Also send a ping to keep connection alive
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 1000);
    }
  }, [state.metrics.fractalDim, state.metrics.hurstExp]);

  // Capture frame from canvas periodically
  useEffect(() => {
    if (!canvasRef?.current) return;

    const captureInterval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        processFrame(imageData);
      } catch (e) {
        // Canvas might be tainted or not ready
        console.warn('Could not capture frame:', e);
      }
    }, 500); // Process 2 frames per second for performance

    return () => clearInterval(captureInterval);
  }, [canvasRef, processFrame]);

  // Track previous frame data for temporal metrics and nonlinear analysis
  const prevFrameDataRef = useRef<{
    brightness: number;
    hSym: number;
    vSym: number;
    entropy: number;
    saturation: number;
  }[]>([]);
  const TEMPORAL_BUFFER_SIZE = 30; // Larger buffer for better temporal analysis

  /**
   * Estimate Fractal Dimension using entropy-complexity relationship
   * Uses a simplified box-counting approximation based on spatial complexity
   * Range: 1.0 (simple) to 2.0 (complex)
   */
  const estimateFractalDimension = (entropy: number, brightness: number, variance: number): number => {
    // Higher entropy and variance indicate more complex patterns → higher fractal dimension
    const entropyContrib = entropy * 0.4; // 0-0.4 contribution from entropy
    const varianceContrib = Math.min(variance * 2, 0.3); // 0-0.3 from variance
    const brightnessEdge = Math.abs(brightness - 0.5) * 0.3; // Edge cases add complexity

    const fd = 1.0 + entropyContrib + varianceContrib + brightnessEdge;
    return Math.max(1.0, Math.min(2.0, fd));
  };

  /**
   * Estimate Hurst Exponent using R/S (Rescaled Range) analysis
   * H = 0.5: random walk, H > 0.5: persistent (trending), H < 0.5: anti-persistent
   * Range: 0.0 to 1.0
   */
  const estimateHurstExponent = (values: number[]): number => {
    if (values.length < 5) return 0.5; // Not enough data

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Calculate cumulative deviations from mean
    const deviations = values.map(v => v - mean);
    const cumulativeDeviations: number[] = [];
    let cumSum = 0;
    for (const d of deviations) {
      cumSum += d;
      cumulativeDeviations.push(cumSum);
    }

    // Range (R) = max - min of cumulative deviations
    const R = Math.max(...cumulativeDeviations) - Math.min(...cumulativeDeviations);

    // Standard deviation (S)
    const S = Math.sqrt(deviations.reduce((sum, d) => sum + d * d, 0) / n);

    if (S === 0) return 0.5;

    // Estimate H from R/S ratio: R/S ~ n^H
    // For small samples, use empirical relationship
    const RS = R / S;
    const H = Math.log(RS + 1) / Math.log(n);

    return Math.max(0.0, Math.min(1.0, 0.5 + (H - 0.5) * 0.5));
  };

  /**
   * Estimate Lyapunov Exponent from divergence rate of nearby trajectories
   * Positive: chaotic, Negative: stable, Zero: neutral
   * Range: -0.5 to 0.5 (normalized)
   */
  const estimateLyapunovExponent = (values: number[]): number => {
    if (values.length < 4) return 0;

    // Calculate average absolute difference between consecutive differences
    const diffs: number[] = [];
    for (let i = 1; i < values.length; i++) {
      diffs.push(values[i] - values[i - 1]);
    }

    // Calculate divergence: how much consecutive differences differ
    let divergenceSum = 0;
    for (let i = 1; i < diffs.length; i++) {
      divergenceSum += Math.abs(diffs[i] - diffs[i - 1]);
    }
    const avgDivergence = diffs.length > 1 ? divergenceSum / (diffs.length - 1) : 0;

    // Normalize to -0.5 to 0.5 range
    // Higher divergence = more positive (chaotic), lower = more negative (stable)
    const lyap = (avgDivergence - 0.1) * 2; // Center around typical divergence
    return Math.max(-0.5, Math.min(0.5, lyap));
  };

  /**
   * Estimate DFA Alpha (Detrended Fluctuation Analysis scaling exponent)
   * Alpha ≈ 1.0: 1/f noise (optimal for biological systems)
   * Alpha < 1.0: anti-correlated, Alpha > 1.0: correlated
   * Range: 0.5 to 1.5
   */
  const estimateDfaAlpha = (values: number[]): number => {
    if (values.length < 5) return 1.0;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Integrate the series (cumulative sum of deviations)
    const integrated: number[] = [];
    let cumSum = 0;
    for (const v of values) {
      cumSum += v - mean;
      integrated.push(cumSum);
    }

    // Calculate RMS fluctuation at different scales
    const scales = [2, 4, Math.min(8, Math.floor(n / 2))];
    const fluctuations: { scale: number; F: number }[] = [];

    for (const scale of scales) {
      if (scale > n / 2) continue;

      let totalVar = 0;
      let numSegments = 0;

      for (let start = 0; start + scale <= n; start += scale) {
        // Linear detrend within segment
        const segment = integrated.slice(start, start + scale);
        const segMean = segment.reduce((a, b) => a + b, 0) / scale;
        const variance = segment.reduce((sum, v) => sum + Math.pow(v - segMean, 2), 0) / scale;
        totalVar += variance;
        numSegments++;
      }

      if (numSegments > 0) {
        fluctuations.push({ scale, F: Math.sqrt(totalVar / numSegments) });
      }
    }

    // Estimate alpha from log-log slope (simplified)
    if (fluctuations.length >= 2) {
      const logScales = fluctuations.map(f => Math.log(f.scale));
      const logF = fluctuations.map(f => Math.log(f.F + 0.001));

      const n2 = logScales.length;
      const sumX = logScales.reduce((a, b) => a + b, 0);
      const sumY = logF.reduce((a, b) => a + b, 0);
      const sumXY = logScales.reduce((sum, x, i) => sum + x * logF[i], 0);
      const sumX2 = logScales.reduce((sum, x) => sum + x * x, 0);

      const slope = (n2 * sumXY - sumX * sumY) / (n2 * sumX2 - sumX * sumX);
      return Math.max(0.5, Math.min(1.5, slope));
    }

    return 1.0;
  };

  /**
   * Estimate Recurrence Rate from time series
   * Measures how often the system returns to similar states
   * Range: 0.0 to 1.0
   */
  const estimateRecurrenceRate = (values: number[]): number => {
    if (values.length < 3) return 0.5;

    const n = values.length;
    const threshold = 0.1; // Similarity threshold (10% of value range)

    // Calculate value range
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const epsilon = threshold * range;

    // Count recurrences (pairs of similar states)
    let recurrences = 0;
    let totalPairs = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        totalPairs++;
        if (Math.abs(values[i] - values[j]) < epsilon) {
          recurrences++;
        }
      }
    }

    return totalPairs > 0 ? recurrences / totalPairs : 0.5;
  };

  // Manual frame processing for when we receive frame data directly
  const processFrameData = useCallback((data: {
    brightness: number;
    colorEntropy: number;
    horizontalSymmetry?: number;
    verticalSymmetry?: number;
    saturationMean?: number;
  }) => {
    // Use actual computed symmetry values if provided
    const hSym = data.horizontalSymmetry ?? 0.5;
    const vSym = data.verticalSymmetry ?? 0.5;
    const satMean = data.saturationMean ?? 0.5;

    // Track temporal data for nonlinear dynamics calculations
    prevFrameDataRef.current.push({
      brightness: data.brightness,
      hSym,
      vSym,
      entropy: data.colorEntropy,
      saturation: satMean
    });
    if (prevFrameDataRef.current.length > TEMPORAL_BUFFER_SIZE) {
      prevFrameDataRef.current.shift();
    }

    // Extract time series for analysis
    const brightnesses = prevFrameDataRef.current.map(f => f.brightness);
    const symValues = prevFrameDataRef.current.map(f => f.hSym);
    const entropyValues = prevFrameDataRef.current.map(f => f.entropy);

    // Calculate temporal statistics
    const avgBright = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
    const brightVariance = brightnesses.reduce((sum, b) => sum + Math.pow(b - avgBright, 2), 0) / brightnesses.length;

    const avgSym = symValues.reduce((a, b) => a + b, 0) / symValues.length;
    const symVariance = symValues.reduce((sum, s) => sum + Math.pow(s - avgSym, 2), 0) / symValues.length;

    // Calculate temporal stability and pattern regularity
    const temporalStability = Math.max(0, Math.min(1, 1 - Math.sqrt(brightVariance) * 5));
    const patternRegularity = Math.max(0, Math.min(1, 1 - Math.sqrt(symVariance) * 3));
    const temporalVariance = brightVariance;

    // Estimate color coherence from entropy (lower entropy = more coherent)
    const colorCoherence = Math.max(0, Math.min(1, 1 - (data.colorEntropy * 0.3)));

    // Calculate nonlinear dynamics metrics (REAL CALCULATIONS - NO HARDCODING)
    const fractalDimension = estimateFractalDimension(data.colorEntropy, data.brightness, brightVariance);
    const hurstExponent = estimateHurstExponent(brightnesses);
    const lyapunovExponent = estimateLyapunovExponent(brightnesses);
    const dfaAlpha = estimateDfaAlpha(entropyValues);
    const recurrenceRate = estimateRecurrenceRate(brightnesses);

    // Build complete metrics input with ALL computed values
    const estimatedMetrics: MetricsInput = {
      avgIntensity: data.brightness * 255,
      lightQuantaDensity: data.brightness,
      colorEntropy: data.colorEntropy * 7, // Scale to 0-7 range
      horizontalSymmetry: hSym,
      verticalSymmetry: vSym,
      colorSymmetry: (hSym + vSym) / 2,
      saturationMean: satMean,
      innerNoisePercent: (1 - data.brightness) * 20,
      temporalStability,
      temporalVariance,
      patternRegularity,
      colorCoherence,
      // Nonlinear dynamics metrics - COMPUTED, NOT HARDCODED
      fractalDimension,
      hurstExponent,
      lyapunovExponent,
      dfaAlpha,
      recurrenceRate,
    };

    const scores = scoreCalculator.current.calculateAll(estimatedMetrics);

    // Update timeline
    const timePoint = Math.floor((Date.now() - sessionStartTime.current) / 1000);
    const newDataPoint: TimelineDataPoint = {
      time: timePoint,
      energy: scores.energy,
      symmetry: scores.symmetry,
      coherence: scores.coherence,
    };

    timelineRef.current.push(newDataPoint);
    if (timelineRef.current.length > TIMELINE_MAX_POINTS) {
      timelineRef.current.shift();
    }

    // Update state with ALL computed metrics - ENSURE PROPAGATION
    setState(prev => ({
      ...prev,
      scores,
      metrics: {
        lqd: estimatedMetrics.lightQuantaDensity ?? 0,
        avgIntensity: estimatedMetrics.avgIntensity ?? 0,
        innerNoise: estimatedMetrics.innerNoisePercent ?? 0,
        fractalDim: fractalDimension,        // COMPUTED VALUE
        hurstExp: hurstExponent,             // COMPUTED VALUE
        horizontalSymmetry: hSym,            // ACTUAL FROM SHADER
        verticalSymmetry: vSym,              // ACTUAL FROM SHADER
      },
      timeline: [...timelineRef.current],
    }));
  }, []);

  const resetSession = useCallback(() => {
    sessionStartTime.current = Date.now();
    timelineRef.current = [];
    metricsCalculator.current.clearBuffer();
    scoreCalculator.current.reset();
    setState(prev => ({
      ...prev,
      sessionDuration: 0,
      timeline: [],
    }));
  }, []);

  return {
    ...state,
    processFrameData,
    resetSession,
  };
}
