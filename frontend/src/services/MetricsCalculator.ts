/**
 * Metrics Calculator - Computes real-time metrics from PIP images
 */
import type { ZoneMasks } from './segmentation';

export interface FrameMetrics {
  timestamp: number;
  
  // Intensity metrics
  avgIntensity: number;
  intensityStdDev: number;
  maxIntensity: number;
  minIntensity: number;
  
  // Area metrics
  lightQuantaDensity: number;
  normalizedArea: number;
  
  // Noise metrics
  innerNoise: number;
  innerNoisePercent: number;
  
  // Symmetry metrics (quick)
  horizontalSymmetry: number;
  verticalSymmetry: number;
  
  // Color metrics
  dominantHue: number;
  saturationMean: number;
  colorEntropy: number;
  
  // Temporal metrics
  frameToFrameChange: number;
}

export interface ZoneMetrics extends FrameMetrics {
  zoneName: string;
  pixelCount: number;
}

export class MetricsCalculator {
  private previousFrame: ImageData | null = null;
  private frameBuffer: FrameMetrics[] = [];
  private bufferSize = 30;

  calculateFromImageData(
    imageData: ImageData,
    mask?: Uint8Array
  ): FrameMetrics {
    const { data, width, height } = imageData;
    const totalPixels = width * height;
    
    // Collect pixel values based on mask
    const intensities: number[] = [];
    const hues: number[] = [];
    const saturations: number[] = [];
    
    for (let i = 0; i < totalPixels; i++) {
      // Skip if mask is provided and pixel is not in mask
      if (mask && mask[i] === 0) continue;
      
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Grayscale intensity
      const intensity = 0.299 * r + 0.587 * g + 0.114 * b;
      intensities.push(intensity);
      
      // HSV conversion for color metrics
      const { h, s } = this.rgbToHsv(r, g, b);
      hues.push(h);
      saturations.push(s);
    }
    
    if (intensities.length === 0) {
      return this.emptyMetrics();
    }
    
    // Calculate basic intensity metrics
    const avgIntensity = this.mean(intensities);
    const intensityStdDev = this.stdDev(intensities, avgIntensity);
    const maxIntensity = Math.max(...intensities);
    const minIntensity = Math.min(...intensities);
    
    // Calculate area metrics
    const threshold = avgIntensity + 0.5 * intensityStdDev;
    const aboveThreshold = intensities.filter(i => i > threshold).length;
    const lightQuantaDensity = aboveThreshold / intensities.length;
    const normalizedArea = intensities.length / totalPixels;
    
    // Noise metrics
    const innerNoise = intensityStdDev;
    const innerNoisePercent = avgIntensity > 0 ? (intensityStdDev / avgIntensity) * 100 : 0;
    
    // Symmetry metrics (horizontal)
    const horizontalSymmetry = this.calculateSymmetry(imageData, 'horizontal', mask);
    const verticalSymmetry = this.calculateSymmetry(imageData, 'vertical', mask);
    
    // Color metrics
    const dominantHue = this.calculateDominantHue(hues);
    const saturationMean = this.mean(saturations);
    const colorEntropy = this.calculateEntropy(hues, 36); // 36 bins (10 degrees each)
    
    // Frame-to-frame change
    const frameToFrameChange = this.calculateFrameChange(imageData);
    this.previousFrame = imageData;
    
    const metrics: FrameMetrics = {
      timestamp: performance.now(),
      avgIntensity,
      intensityStdDev,
      maxIntensity,
      minIntensity,
      lightQuantaDensity,
      normalizedArea,
      innerNoise,
      innerNoisePercent,
      horizontalSymmetry,
      verticalSymmetry,
      dominantHue,
      saturationMean,
      colorEntropy,
      frameToFrameChange,
    };
    
    // Add to buffer
    this.frameBuffer.push(metrics);
    if (this.frameBuffer.length > this.bufferSize) {
      this.frameBuffer.shift();
    }
    
    return metrics;
  }

  calculateZoneMetrics(
    imageData: ImageData,
    zoneMasks: ZoneMasks
  ): Map<string, ZoneMetrics> {
    const results = new Map<string, ZoneMetrics>();
    
    const zones: [string, Uint8Array][] = [
      ['body', zoneMasks.body],
      ['proximalField', zoneMasks.proximalField],
      ['distalField', zoneMasks.distalField],
      ['extendedField', zoneMasks.extendedField],
      ['background', zoneMasks.background],
      ['combinedField', zoneMasks.combinedField],
    ];
    
    for (const [zoneName, mask] of zones) {
      const baseMetrics = this.calculateFromImageData(imageData, mask);
      const pixelCount = this.countMaskPixels(mask);
      
      results.set(zoneName, {
        ...baseMetrics,
        zoneName,
        pixelCount,
      });
    }
    
    return results;
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private stdDev(arr: number[], mean?: number): number {
    if (arr.length < 2) return 0;
    const m = mean ?? this.mean(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
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

  private calculateSymmetry(
    imageData: ImageData,
    axis: 'horizontal' | 'vertical',
    mask?: Uint8Array
  ): number {
    const { data, width, height } = imageData;
    let sum = 0;
    let count = 0;
    
    if (axis === 'horizontal') {
      const midX = Math.floor(width / 2);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < midX; x++) {
          const leftIdx = y * width + x;
          const rightIdx = y * width + (width - 1 - x);
          
          if (mask && (mask[leftIdx] === 0 || mask[rightIdx] === 0)) continue;
          
          const leftPixelIdx = leftIdx * 4;
          const rightPixelIdx = rightIdx * 4;
          
          const leftIntensity = 0.299 * data[leftPixelIdx] + 0.587 * data[leftPixelIdx + 1] + 0.114 * data[leftPixelIdx + 2];
          const rightIntensity = 0.299 * data[rightPixelIdx] + 0.587 * data[rightPixelIdx + 1] + 0.114 * data[rightPixelIdx + 2];
          
          sum += 1 - Math.abs(leftIntensity - rightIntensity) / 255;
          count++;
        }
      }
    } else {
      const midY = Math.floor(height / 2);
      
      for (let y = 0; y < midY; y++) {
        for (let x = 0; x < width; x++) {
          const topIdx = y * width + x;
          const bottomIdx = (height - 1 - y) * width + x;
          
          if (mask && (mask[topIdx] === 0 || mask[bottomIdx] === 0)) continue;
          
          const topPixelIdx = topIdx * 4;
          const bottomPixelIdx = bottomIdx * 4;
          
          const topIntensity = 0.299 * data[topPixelIdx] + 0.587 * data[topPixelIdx + 1] + 0.114 * data[topPixelIdx + 2];
          const bottomIntensity = 0.299 * data[bottomPixelIdx] + 0.587 * data[bottomPixelIdx + 1] + 0.114 * data[bottomPixelIdx + 2];
          
          sum += 1 - Math.abs(topIntensity - bottomIntensity) / 255;
          count++;
        }
      }
    }
    
    return count > 0 ? sum / count : 0;
  }

  private calculateDominantHue(hues: number[]): number {
    if (hues.length === 0) return 0;
    
    // Create histogram with 36 bins (10 degrees each)
    const bins = new Array(36).fill(0);
    for (const h of hues) {
      const bin = Math.floor(h / 10) % 36;
      bins[bin]++;
    }
    
    const maxBin = bins.indexOf(Math.max(...bins));
    return maxBin * 10 + 5; // Return center of bin
  }

  private calculateEntropy(values: number[], numBins: number): number {
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

  private calculateFrameChange(currentFrame: ImageData): number {
    if (!this.previousFrame) return 0;
    if (
      this.previousFrame.width !== currentFrame.width ||
      this.previousFrame.height !== currentFrame.height
    ) {
      return 0;
    }
    
    const curr = currentFrame.data;
    const prev = this.previousFrame.data;
    let totalDiff = 0;
    const numPixels = curr.length / 4;
    
    for (let i = 0; i < curr.length; i += 4) {
      const currIntensity = 0.299 * curr[i] + 0.587 * curr[i + 1] + 0.114 * curr[i + 2];
      const prevIntensity = 0.299 * prev[i] + 0.587 * prev[i + 1] + 0.114 * prev[i + 2];
      totalDiff += Math.abs(currIntensity - prevIntensity);
    }
    
    return totalDiff / (numPixels * 255);
  }

  private countMaskPixels(mask: Uint8Array): number {
    let count = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] > 0) count++;
    }
    return count;
  }

  private emptyMetrics(): FrameMetrics {
    return {
      timestamp: performance.now(),
      avgIntensity: 0,
      intensityStdDev: 0,
      maxIntensity: 0,
      minIntensity: 0,
      lightQuantaDensity: 0,
      normalizedArea: 0,
      innerNoise: 0,
      innerNoisePercent: 0,
      horizontalSymmetry: 0,
      verticalSymmetry: 0,
      dominantHue: 0,
      saturationMean: 0,
      colorEntropy: 0,
      frameToFrameChange: 0,
    };
  }

  getTemporalStability(): number {
    if (this.frameBuffer.length < 2) return 1.0;
    
    const intensities = this.frameBuffer.map(f => f.avgIntensity);
    const mean = this.mean(intensities);
    const std = this.stdDev(intensities, mean);
    
    return mean > 0 ? 1 - Math.min(std / mean, 1) : 1.0;
  }

  getTrend(metric: keyof FrameMetrics): number {
    if (this.frameBuffer.length < 3) return 0;
    
    const values = this.frameBuffer.map(f => f[metric] as number);
    const n = values.length;
    
    // Simple linear regression slope
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  clearBuffer(): void {
    this.frameBuffer = [];
    this.previousFrame = null;
  }
}
