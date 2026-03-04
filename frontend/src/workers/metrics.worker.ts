/**
 * Web Worker for metric extraction
 * Offloads CPU-intensive metric calculations from the main thread
 */

interface WorkerMessage {
  type: 'calculate' | 'calculateZones' | 'clear';
  payload?: {
    imageData?: ImageData;
    mask?: Uint8Array;
    zoneMasks?: {
      body: Uint8Array;
      proximalField: Uint8Array;
      distalField: Uint8Array;
      extendedField: Uint8Array;
      background: Uint8Array;
      combinedField: Uint8Array;
    };
    width?: number;
    height?: number;
  };
}

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

const frameBuffer: FrameMetrics[] = [];
const BUFFER_SIZE = 30;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
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
      frameBuffer.length = 0;
      self.postMessage({ type: 'cleared' });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
};

function calculateMetrics(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mask?: Uint8Array
): FrameMetrics {
  const totalPixels = width * height;
  const intensities: number[] = [];
  const hues: number[] = [];
  const saturations: number[] = [];

  for (let i = 0; i < totalPixels; i++) {
    if (mask && mask[i] === 0) continue;

    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    // Grayscale intensity
    const intensity = 0.299 * r + 0.587 * g + 0.114 * b;
    intensities.push(intensity);

    // HSV conversion
    const { h, s } = rgbToHsv(r, g, b);
    hues.push(h);
    saturations.push(s);
  }

  if (intensities.length === 0) {
    return emptyMetrics();
  }

  // Basic intensity metrics
  const avgIntensity = mean(intensities);
  const intensityStdDev = stdDev(intensities, avgIntensity);
  const maxIntensity = Math.max(...intensities);
  const minIntensity = Math.min(...intensities);

  // Area metrics
  const threshold = avgIntensity + 0.5 * intensityStdDev;
  const aboveThreshold = intensities.filter((i) => i > threshold).length;
  const lightQuantaDensity = aboveThreshold / intensities.length;
  const normalizedArea = intensities.length / totalPixels;

  // Noise metrics
  const innerNoise = intensityStdDev;
  const innerNoisePercent =
    avgIntensity > 0 ? (intensityStdDev / avgIntensity) * 100 : 0;

  // Horizontal symmetry (quick calculation)
  const horizontalSymmetry = calculateHorizontalSymmetry(data, width, height, mask);

  // Color metrics
  const dominantHue = calculateDominantHue(hues);
  const saturationMean = mean(saturations);
  const colorEntropy = calculateEntropy(hues, 36);

  const metrics: FrameMetrics = {
    timestamp: Date.now(),
    avgIntensity,
    intensityStdDev,
    maxIntensity,
    minIntensity,
    lightQuantaDensity,
    normalizedArea,
    innerNoise,
    innerNoisePercent,
    horizontalSymmetry,
    dominantHue,
    saturationMean,
    colorEntropy,
  };

  // Update buffer
  frameBuffer.push(metrics);
  if (frameBuffer.length > BUFFER_SIZE) {
    frameBuffer.shift();
  }

  return metrics;
}

function calculateZoneMetrics(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  zoneMasks: {
    body: Uint8Array;
    proximalField: Uint8Array;
    distalField: Uint8Array;
    extendedField: Uint8Array;
    background: Uint8Array;
    combinedField: Uint8Array;
  }
): Record<string, FrameMetrics & { pixelCount: number }> {
  const results: Record<string, FrameMetrics & { pixelCount: number }> = {};

  const zones: [string, Uint8Array][] = [
    ['body', zoneMasks.body],
    ['proximalField', zoneMasks.proximalField],
    ['distalField', zoneMasks.distalField],
    ['extendedField', zoneMasks.extendedField],
    ['background', zoneMasks.background],
    ['combinedField', zoneMasks.combinedField],
  ];

  for (const [zoneName, mask] of zones) {
    const metrics = calculateMetrics(data, width, height, mask);
    const pixelCount = countMaskPixels(mask);
    results[zoneName] = { ...metrics, pixelCount };
  }

  return results;
}

// Helper functions
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function stdDev(arr: number[], m?: number): number {
  if (arr.length < 2) return 0;
  const avg = m ?? mean(arr);
  const variance =
    arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function rgbToHsv(
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, v };
}

function calculateHorizontalSymmetry(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mask?: Uint8Array
): number {
  const midX = Math.floor(width / 2);
  let sum = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < midX; x++) {
      const leftIdx = y * width + x;
      const rightIdx = y * width + (width - 1 - x);

      if (mask && (mask[leftIdx] === 0 || mask[rightIdx] === 0)) continue;

      const leftPixelIdx = leftIdx * 4;
      const rightPixelIdx = rightIdx * 4;

      const leftIntensity =
        0.299 * data[leftPixelIdx] +
        0.587 * data[leftPixelIdx + 1] +
        0.114 * data[leftPixelIdx + 2];
      const rightIntensity =
        0.299 * data[rightPixelIdx] +
        0.587 * data[rightPixelIdx + 1] +
        0.114 * data[rightPixelIdx + 2];

      sum += 1 - Math.abs(leftIntensity - rightIntensity) / 255;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

function calculateDominantHue(hues: number[]): number {
  if (hues.length === 0) return 0;

  const bins = new Array(36).fill(0);
  for (const h of hues) {
    const bin = Math.floor(h / 10) % 36;
    bins[bin]++;
  }

  const maxBin = bins.indexOf(Math.max(...bins));
  return maxBin * 10 + 5;
}

function calculateEntropy(values: number[], numBins: number): number {
  if (values.length === 0) return 0;

  const bins = new Array(numBins).fill(0);
  const binSize = 360 / numBins;

  for (const v of values) {
    const bin = Math.floor(v / binSize) % numBins;
    bins[bin]++;
  }

  let entropy = 0;
  const total = values.length;

  for (const count of bins) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

function countMaskPixels(mask: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 0) count++;
  }
  return count;
}

function emptyMetrics(): FrameMetrics {
  return {
    timestamp: Date.now(),
    avgIntensity: 0,
    intensityStdDev: 0,
    maxIntensity: 0,
    minIntensity: 0,
    lightQuantaDensity: 0,
    normalizedArea: 0,
    innerNoise: 0,
    innerNoisePercent: 0,
    horizontalSymmetry: 0,
    dominantHue: 0,
    saturationMean: 0,
    colorEntropy: 0,
  };
}
