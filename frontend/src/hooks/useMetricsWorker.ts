/**
 * Custom hook for using the metrics Web Worker
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ZoneMasks } from '../services/segmentation';

interface FrameMetrics {
  timestamp: number;
  avgIntensity: number;
  intensityStdDev: number;
  maxIntensity: number;
  minIntensity: number;
  lightQuantaDensity: number;
  normalizedArea: number;
  innerNoise: number;
  innerNoisePercent: number;
  horizontalSymmetry: number;
  dominantHue: number;
  saturationMean: number;
  colorEntropy: number;
}

interface ZoneMetrics extends FrameMetrics {
  pixelCount: number;
}

interface UseMetricsWorkerReturn {
  metrics: FrameMetrics | null;
  zoneMetrics: Record<string, ZoneMetrics> | null;
  isProcessing: boolean;
  calculateMetrics: (imageData: ImageData, mask?: Uint8Array) => void;
  calculateZoneMetrics: (imageData: ImageData, zoneMasks: ZoneMasks) => void;
  clear: () => void;
}

export function useMetricsWorker(): UseMetricsWorkerReturn {
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null);
  const [zoneMetrics, setZoneMetrics] = useState<Record<string, ZoneMetrics> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    // Create worker from blob to avoid build issues
    const workerCode = `
      // Worker code inline
      let previousFrameData = null;
      const frameBuffer = [];
      const BUFFER_SIZE = 30;

      self.onmessage = (event) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'calculate':
            if (payload?.imageData) {
              const metrics = calculateMetrics(
                payload.imageData.data,
                payload.imageData.width,
                payload.imageData.height,
                payload.mask
              );
              self.postMessage({ type: 'metrics', payload: metrics });
            }
            break;
          case 'calculateZones':
            if (payload?.imageData && payload?.zoneMasks) {
              const zoneMetrics = calculateZoneMetrics(
                payload.imageData.data,
                payload.imageData.width,
                payload.imageData.height,
                payload.zoneMasks
              );
              self.postMessage({ type: 'zoneMetrics', payload: zoneMetrics });
            }
            break;
          case 'clear':
            previousFrameData = null;
            frameBuffer.length = 0;
            self.postMessage({ type: 'cleared' });
            break;
        }
      };

      function calculateMetrics(data, width, height, mask) {
        const totalPixels = width * height;
        const intensities = [];
        const hues = [];
        const saturations = [];

        for (let i = 0; i < totalPixels; i++) {
          if (mask && mask[i] === 0) continue;
          const idx = i * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const intensity = 0.299 * r + 0.587 * g + 0.114 * b;
          intensities.push(intensity);
          const hsv = rgbToHsv(r, g, b);
          hues.push(hsv.h);
          saturations.push(hsv.s);
        }

        if (intensities.length === 0) return emptyMetrics();

        const avgIntensity = mean(intensities);
        const intensityStdDev = stdDev(intensities, avgIntensity);
        const maxIntensity = Math.max(...intensities);
        const minIntensity = Math.min(...intensities);
        const threshold = avgIntensity + 0.5 * intensityStdDev;
        const aboveThreshold = intensities.filter(i => i > threshold).length;
        const lightQuantaDensity = aboveThreshold / intensities.length;
        const normalizedArea = intensities.length / totalPixels;
        const innerNoise = intensityStdDev;
        const innerNoisePercent = avgIntensity > 0 ? (intensityStdDev / avgIntensity) * 100 : 0;
        const horizontalSymmetry = calcHorizontalSymmetry(data, width, height, mask);
        const dominantHue = calcDominantHue(hues);
        const saturationMean = mean(saturations);
        const colorEntropy = calcEntropy(hues, 36);

        return {
          timestamp: Date.now(),
          avgIntensity, intensityStdDev, maxIntensity, minIntensity,
          lightQuantaDensity, normalizedArea, innerNoise, innerNoisePercent,
          horizontalSymmetry, dominantHue, saturationMean, colorEntropy
        };
      }

      function calculateZoneMetrics(data, width, height, zoneMasks) {
        const results = {};
        const zones = [
          ['body', zoneMasks.body],
          ['proximalField', zoneMasks.proximalField],
          ['distalField', zoneMasks.distalField],
          ['extendedField', zoneMasks.extendedField],
          ['background', zoneMasks.background],
          ['combinedField', zoneMasks.combinedField]
        ];
        for (const [zoneName, mask] of zones) {
          const metrics = calculateMetrics(data, width, height, mask);
          let pixelCount = 0;
          for (let i = 0; i < mask.length; i++) if (mask[i] > 0) pixelCount++;
          results[zoneName] = { ...metrics, pixelCount };
        }
        return results;
      }

      function mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((s, v) => s + v, 0) / arr.length;
      }

      function stdDev(arr, m) {
        if (arr.length < 2) return 0;
        const avg = m ?? mean(arr);
        return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / arr.length);
      }

      function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max, v = max;
        if (d !== 0) {
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        return { h: h * 360, s, v };
      }

      function calcHorizontalSymmetry(data, width, height, mask) {
        const midX = Math.floor(width / 2);
        let sum = 0, count = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < midX; x++) {
            const leftIdx = y * width + x, rightIdx = y * width + (width - 1 - x);
            if (mask && (mask[leftIdx] === 0 || mask[rightIdx] === 0)) continue;
            const li = leftIdx * 4, ri = rightIdx * 4;
            const lInt = 0.299 * data[li] + 0.587 * data[li+1] + 0.114 * data[li+2];
            const rInt = 0.299 * data[ri] + 0.587 * data[ri+1] + 0.114 * data[ri+2];
            sum += 1 - Math.abs(lInt - rInt) / 255;
            count++;
          }
        }
        return count > 0 ? sum / count : 0;
      }

      function calcDominantHue(hues) {
        if (hues.length === 0) return 0;
        const bins = new Array(36).fill(0);
        for (const h of hues) bins[Math.floor(h / 10) % 36]++;
        return bins.indexOf(Math.max(...bins)) * 10 + 5;
      }

      function calcEntropy(values, numBins) {
        if (values.length === 0) return 0;
        const bins = new Array(numBins).fill(0), binSize = 360 / numBins;
        for (const v of values) bins[Math.floor(v / binSize) % numBins]++;
        let entropy = 0;
        for (const count of bins) {
          if (count > 0) {
            const p = count / values.length;
            entropy -= p * Math.log2(p);
          }
        }
        return entropy;
      }

      function emptyMetrics() {
        return {
          timestamp: Date.now(), avgIntensity: 0, intensityStdDev: 0,
          maxIntensity: 0, minIntensity: 0, lightQuantaDensity: 0,
          normalizedArea: 0, innerNoise: 0, innerNoisePercent: 0,
          horizontalSymmetry: 0, dominantHue: 0, saturationMean: 0, colorEntropy: 0
        };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'metrics':
          setMetrics(payload);
          setIsProcessing(false);
          break;
        case 'zoneMetrics':
          setZoneMetrics(payload);
          setIsProcessing(false);
          break;
        case 'cleared':
          setMetrics(null);
          setZoneMetrics(null);
          setIsProcessing(false);
          break;
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        URL.revokeObjectURL(workerUrl);
      }
    };
  }, []);

  const calculateMetricsCallback = useCallback(
    (imageData: ImageData, mask?: Uint8Array) => {
      if (workerRef.current && !isProcessing) {
        setIsProcessing(true);
        workerRef.current.postMessage({
          type: 'calculate',
          payload: { imageData, mask },
        });
      }
    },
    [isProcessing]
  );

  const calculateZoneMetricsCallback = useCallback(
    (imageData: ImageData, zoneMasks: ZoneMasks) => {
      if (workerRef.current && !isProcessing) {
        setIsProcessing(true);
        workerRef.current.postMessage({
          type: 'calculateZones',
          payload: { imageData, zoneMasks },
        });
      }
    },
    [isProcessing]
  );

  const clear = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'clear' });
    }
  }, []);

  return {
    metrics,
    zoneMetrics,
    isProcessing,
    calculateMetrics: calculateMetricsCallback,
    calculateZoneMetrics: calculateZoneMetricsCallback,
    clear,
  };
}
