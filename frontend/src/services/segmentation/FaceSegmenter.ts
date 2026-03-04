/**
 * Face Segmenter using MediaPipe Face Landmarker
 * Provides 478 facial landmarks for detailed face region analysis
 */
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceRegion {
  name: string;
  landmarks: number[];
  mask?: Uint8Array;
}

export interface FaceSegmentationResult {
  faceDetected: boolean;
  landmarks: FaceLandmark[];
  midlineX: number;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  regions: Map<string, FaceRegion>;
  blendshapes?: { categoryName: string; score: number }[];
}

// Face region landmark indices (MediaPipe Face Mesh 478 landmarks)
export const FACE_REGIONS: Record<string, number[]> = {
  face_oval: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
    378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
  ],
  left_eye: [
    33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  ],
  right_eye: [
    362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384,
    398,
  ],
  left_eyebrow: [276, 283, 282, 295, 285, 300, 293, 334, 296, 336],
  right_eyebrow: [46, 53, 52, 65, 55, 70, 63, 105, 66, 107],
  nose: [
    168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 164, 0, 11, 12, 13, 14, 15, 16, 17,
    18, 200, 199, 175,
  ],
  upper_lip: [
    61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312,
    13, 82, 81, 80, 191, 78,
  ],
  lower_lip: [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317,
    14, 87, 178, 88, 95, 78,
  ],
  left_cheek: [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152],
  right_cheek: [454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152],
};

// Symmetry pairs for comparison
export const SYMMETRY_PAIRS: [string, string][] = [
  ['left_eye', 'right_eye'],
  ['left_eyebrow', 'right_eyebrow'],
  ['left_cheek', 'right_cheek'],
];

export interface FaceSegmenterConfig {
  runningMode?: 'IMAGE' | 'VIDEO';
  numFaces?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  outputFaceBlendshapes?: boolean;
}

const DEFAULT_CONFIG: FaceSegmenterConfig = {
  runningMode: 'VIDEO',
  numFaces: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  outputFaceBlendshapes: false,
};

export class FaceSegmenter {
  private faceLandmarker: FaceLandmarker | null = null;
  private isInitialized = false;
  private lastResult: FaceSegmentationResult | null = null;
  private config: FaceSegmenterConfig;
  private imageWidth = 640;
  private imageHeight = 480;

  constructor(config: FaceSegmenterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: this.config.runningMode,
        numFaces: this.config.numFaces,
        minFaceDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
        outputFaceBlendshapes: this.config.outputFaceBlendshapes,
      });

      this.isInitialized = true;
      console.log('FaceSegmenter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FaceSegmenter:', error);
      throw error;
    }
  }

  async detect(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    timestamp?: number
  ): Promise<FaceSegmentationResult> {
    if (!this.faceLandmarker || !this.isInitialized) {
      throw new Error('FaceSegmenter not initialized. Call initialize() first.');
    }

    this.imageWidth = input.width || (input as HTMLVideoElement).videoWidth;
    this.imageHeight = input.height || (input as HTMLVideoElement).videoHeight;

    let result: FaceLandmarkerResult;

    if (this.config.runningMode === 'VIDEO') {
      const ts = timestamp ?? performance.now();
      result = this.faceLandmarker.detectForVideo(input, ts);
    } else {
      result = this.faceLandmarker.detect(input);
    }

    return this.processResult(result);
  }

  private processResult(result: FaceLandmarkerResult): FaceSegmentationResult {
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      const emptyResult: FaceSegmentationResult = {
        faceDetected: false,
        landmarks: [],
        midlineX: this.imageWidth / 2,
        boundingBox: null,
        regions: new Map(),
      };
      this.lastResult = emptyResult;
      return emptyResult;
    }

    // Use first face
    const faceLandmarks = result.faceLandmarks[0];

    // Convert normalized landmarks to pixel coordinates
    const landmarks: FaceLandmark[] = faceLandmarks.map(
      (lm: NormalizedLandmark) => ({
        x: Math.round(lm.x * this.imageWidth),
        y: Math.round(lm.y * this.imageHeight),
        z: lm.z,
      })
    );

    // Calculate midline from nose tip (landmark 4)
    const noseTip = landmarks[4];
    const midlineX = noseTip?.x ?? this.imageWidth / 2;

    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(landmarks);

    // Create region map
    const regions = new Map<string, FaceRegion>();
    for (const [regionName, indices] of Object.entries(FACE_REGIONS)) {
      regions.set(regionName, {
        name: regionName,
        landmarks: indices,
      });
    }

    // Get blendshapes if available
    const blendshapes = result.faceBlendshapes?.[0]?.categories?.map((c) => ({
      categoryName: c.categoryName,
      score: c.score,
    }));

    const segmentationResult: FaceSegmentationResult = {
      faceDetected: true,
      landmarks,
      midlineX,
      boundingBox,
      regions,
      blendshapes,
    };

    this.lastResult = segmentationResult;
    return segmentationResult;
  }

  private calculateBoundingBox(landmarks: FaceLandmark[]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (landmarks.length === 0) return null;

    const padding = 20;
    const xs = landmarks.map((l) => l.x);
    const ys = landmarks.map((l) => l.y);

    const minX = Math.max(0, Math.min(...xs) - padding);
    const maxX = Math.min(this.imageWidth, Math.max(...xs) + padding);
    const minY = Math.max(0, Math.min(...ys) - padding);
    const maxY = Math.min(this.imageHeight, Math.max(...ys) + padding);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  createRegionMask(
    regionName: string,
    width: number,
    height: number
  ): Uint8Array | null {
    if (!this.lastResult?.faceDetected || !this.lastResult.landmarks.length) {
      return null;
    }

    const indices = FACE_REGIONS[regionName];
    if (!indices) return null;

    const mask = new Uint8Array(width * height);
    const landmarks = this.lastResult.landmarks;

    // Get region points
    const points = indices
      .filter((i) => i < landmarks.length)
      .map((i) => landmarks[i]);

    if (points.length < 3) return null;

    // Simple polygon fill using scanline algorithm
    this.fillPolygon(mask, width, height, points);

    return mask;
  }

  private fillPolygon(
    mask: Uint8Array,
    width: number,
    height: number,
    points: FaceLandmark[]
  ): void {
    // Find bounding box
    const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y))));
    const maxY = Math.min(
      height - 1,
      Math.ceil(Math.max(...points.map((p) => p.y)))
    );

    // Scanline fill
    for (let y = minY; y <= maxY; y++) {
      const intersections: number[] = [];

      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          const x = p1.x + ((y - p1.y) / (p2.y - p1.y)) * (p2.x - p1.x);
          intersections.push(x);
        }
      }

      intersections.sort((a, b) => a - b);

      for (let i = 0; i < intersections.length - 1; i += 2) {
        const startX = Math.max(0, Math.floor(intersections[i]));
        const endX = Math.min(width - 1, Math.ceil(intersections[i + 1]));

        for (let x = startX; x <= endX; x++) {
          mask[y * width + x] = 255;
        }
      }
    }
  }

  getLandmarks(): FaceLandmark[] {
    return this.lastResult?.landmarks ?? [];
  }

  getLastResult(): FaceSegmentationResult | null {
    return this.lastResult;
  }

  getMidlineX(): number {
    return this.lastResult?.midlineX ?? this.imageWidth / 2;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  close(): void {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.isInitialized = false;
    this.lastResult = null;
  }
}
