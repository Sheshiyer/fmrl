/**
 * Body Segmenter using MediaPipe Image Segmenter
 * Provides real-time body/background separation in the browser
 */
import {
  ImageSegmenter,
  ImageSegmenterResult,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

export interface SegmentationResult {
  mask: Uint8Array;
  confidenceMap: Float32Array;
  width: number;
  height: number;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  centroid: { x: number; y: number };
  bodyArea: number;
  bodyDetected: boolean;
}

export interface BodySegmenterConfig {
  runningMode?: 'IMAGE' | 'VIDEO';
  outputCategoryMask?: boolean;
  outputConfidenceMasks?: boolean;
}

const DEFAULT_CONFIG: BodySegmenterConfig = {
  runningMode: 'VIDEO',
  outputCategoryMask: true,
  outputConfidenceMasks: true,
};

export class BodySegmenter {
  private segmenter: ImageSegmenter | null = null;
  private isInitialized = false;
  private lastResult: SegmentationResult | null = null;
  private config: BodySegmenterConfig;

  constructor(config: BodySegmenterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
          delegate: 'GPU',
        },
        runningMode: this.config.runningMode,
        outputCategoryMask: this.config.outputCategoryMask,
        outputConfidenceMasks: this.config.outputConfidenceMasks,
      });

      this.isInitialized = true;
      console.log('BodySegmenter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BodySegmenter:', error);
      throw error;
    }
  }

  async segment(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    timestamp?: number
  ): Promise<SegmentationResult> {
    if (!this.segmenter || !this.isInitialized) {
      throw new Error('BodySegmenter not initialized. Call initialize() first.');
    }

    let result: ImageSegmenterResult;

    if (this.config.runningMode === 'VIDEO') {
      const ts = timestamp ?? performance.now();
      result = this.segmenter.segmentForVideo(input, ts);
    } else {
      result = this.segmenter.segment(input);
    }

    return this.processResult(result, input.width || (input as HTMLVideoElement).videoWidth, input.height || (input as HTMLVideoElement).videoHeight);
  }

  private processResult(
    result: ImageSegmenterResult,
    width: number,
    height: number
  ): SegmentationResult {
    const categoryMask = result.categoryMask;
    const confidenceMasks = result.confidenceMasks;

    // Get the mask data - prefer confidence mask for better quality
    const maskData: Uint8Array = new Uint8Array(width * height);
    const confidenceData: Float32Array = new Float32Array(width * height);
    let maskExtracted = false;

    // Try confidence mask first (better quality for selfie segmentation)
    if (confidenceMasks && confidenceMasks.length > 0) {
      const mask = confidenceMasks[0];
      
      // Try getAsFloat32Array first (MediaPipe's preferred method)
      try {
        if (typeof mask.getAsFloat32Array === 'function') {
          const floatData = mask.getAsFloat32Array();
          const maskWidth = mask.width;
          const maskHeight = mask.height;
          
          console.log('[BodySegmenter] Got float32 mask:', maskWidth, 'x', maskHeight, 'length:', floatData.length);
          
          if (maskWidth === width && maskHeight === height) {
            for (let i = 0; i < floatData.length; i++) {
              confidenceData[i] = floatData[i];
              maskData[i] = floatData[i] > 0.5 ? 255 : 0;
            }
          } else {
            // Scale the mask
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const srcX = Math.floor(x * maskWidth / width);
                const srcY = Math.floor(y * maskHeight / height);
                const srcIdx = srcY * maskWidth + srcX;
                const dstIdx = y * width + x;
                confidenceData[dstIdx] = floatData[srcIdx];
                maskData[dstIdx] = floatData[srcIdx] > 0.5 ? 255 : 0;
              }
            }
          }
          maskExtracted = true;
        }
      } catch (e) {
        console.warn('[BodySegmenter] getAsFloat32Array failed:', e);
      }
      
      // Fallback to canvas if float array didn't work
      if (!maskExtracted && mask.canvas) {
        const canvas = mask.canvas;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const maskWidth = canvas.width;
          const maskHeight = canvas.height;
          const imageData = ctx.getImageData(0, 0, maskWidth, maskHeight);
          
          console.log('[BodySegmenter] Got canvas mask:', maskWidth, 'x', maskHeight);
          
          if (maskWidth === width && maskHeight === height) {
            for (let i = 0; i < width * height; i++) {
              const confidence = imageData.data[i * 4] / 255;
              confidenceData[i] = confidence;
              maskData[i] = confidence > 0.5 ? 255 : 0;
            }
          } else {
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const srcX = Math.floor(x * maskWidth / width);
                const srcY = Math.floor(y * maskHeight / height);
                const srcIdx = srcY * maskWidth + srcX;
                const dstIdx = y * width + x;
                const confidence = imageData.data[srcIdx * 4] / 255;
                confidenceData[dstIdx] = confidence;
                maskData[dstIdx] = confidence > 0.5 ? 255 : 0;
              }
            }
          }
          maskExtracted = true;
        }
      }
    }
    
    // Fallback to category mask
    if (!maskExtracted && categoryMask) {
      try {
        if (typeof categoryMask.getAsUint8Array === 'function') {
          const uint8Data = categoryMask.getAsUint8Array();
          const maskWidth = categoryMask.width;
          const maskHeight = categoryMask.height;
          
          console.log('[BodySegmenter] Got uint8 category mask:', maskWidth, 'x', maskHeight);
          
          if (maskWidth === width && maskHeight === height) {
            for (let i = 0; i < uint8Data.length; i++) {
              maskData[i] = uint8Data[i] > 0 ? 255 : 0;
            }
          } else {
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const srcX = Math.floor(x * maskWidth / width);
                const srcY = Math.floor(y * maskHeight / height);
                const srcIdx = srcY * maskWidth + srcX;
                const dstIdx = y * width + x;
                maskData[dstIdx] = uint8Data[srcIdx] > 0 ? 255 : 0;
              }
            }
          }
          maskExtracted = true;
        }
      } catch (e) {
        console.warn('[BodySegmenter] getAsUint8Array failed:', e);
      }
      
      if (!maskExtracted && categoryMask.canvas) {
        const canvas = categoryMask.canvas;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const maskWidth = canvas.width;
          const maskHeight = canvas.height;
          const imageData = ctx.getImageData(0, 0, maskWidth, maskHeight);
          
          if (maskWidth === width && maskHeight === height) {
            for (let i = 0; i < maskData.length; i++) {
              maskData[i] = imageData.data[i * 4] > 0 ? 255 : 0;
            }
          } else {
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const srcX = Math.floor(x * maskWidth / width);
                const srcY = Math.floor(y * maskHeight / height);
                const srcIdx = srcY * maskWidth + srcX;
                const dstIdx = y * width + x;
                maskData[dstIdx] = imageData.data[srcIdx * 4] > 0 ? 255 : 0;
              }
            }
          }
          maskExtracted = true;
        }
      }
    }
    
    if (!maskExtracted) {
      console.warn('[BodySegmenter] Could not extract mask from result');
    }

    // Calculate bounding box and centroid
    const { boundingBox, centroid, bodyArea } = this.calculateBodyMetrics(
      maskData,
      width,
      height
    );

    const segmentationResult: SegmentationResult = {
      mask: maskData,
      confidenceMap: confidenceData,
      width,
      height,
      boundingBox,
      centroid,
      bodyArea,
      bodyDetected: bodyArea > 0,
    };

    this.lastResult = segmentationResult;
    return segmentationResult;
  }

  private calculateBodyMetrics(
    mask: Uint8Array,
    width: number,
    height: number
  ): {
    boundingBox: { x: number; y: number; width: number; height: number } | null;
    centroid: { x: number; y: number };
    bodyArea: number;
  } {
    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0;
    let sumX = 0,
      sumY = 0,
      count = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count === 0) {
      return {
        boundingBox: null,
        centroid: { x: width / 2, y: height / 2 },
        bodyArea: 0,
      };
    }

    return {
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      centroid: {
        x: Math.round(sumX / count),
        y: Math.round(sumY / count),
      },
      bodyArea: count,
    };
  }

  getMask(): Uint8Array | null {
    return this.lastResult?.mask ?? null;
  }

  getConfidenceMap(): Float32Array | null {
    return this.lastResult?.confidenceMap ?? null;
  }

  getLastResult(): SegmentationResult | null {
    return this.lastResult;
  }

  getMidlineX(): number {
    if (this.lastResult?.centroid) {
      return this.lastResult.centroid.x;
    }
    return this.lastResult?.width ? this.lastResult.width / 2 : 320;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  close(): void {
    if (this.segmenter) {
      this.segmenter.close();
      this.segmenter = null;
    }
    this.isInitialized = false;
    this.lastResult = null;
  }
}
