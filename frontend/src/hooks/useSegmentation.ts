/**
 * Custom hook for body/face segmentation
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BodySegmenter,
  FaceSegmenter,
  ZoneCreator,
} from '../services/segmentation';
import type {
  SegmentationResult,
  FaceSegmentationResult,
  ZoneData,
} from '../services/segmentation';
import type { AnalysisMode } from '../types';

interface UseSegmentationOptions {
  mode?: AnalysisMode;
  enableZones?: boolean;
}

interface UseSegmentationReturn {
  bodyResult: SegmentationResult | null;
  faceResult: FaceSegmentationResult | null;
  zoneData: ZoneData | null;
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  processFrame: (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    timestamp?: number
  ) => Promise<void>;
  setMode: (mode: AnalysisMode) => void;
  close: () => void;
}

export function useSegmentation(
  options: UseSegmentationOptions = {}
): UseSegmentationReturn {
  const { mode: initialMode = 'fullBody', enableZones = true } = options;

  const [bodyResult, setBodyResult] = useState<SegmentationResult | null>(null);
  const [faceResult, setFaceResult] = useState<FaceSegmentationResult | null>(null);
  const [zoneData, setZoneData] = useState<ZoneData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalysisMode>(initialMode);

  const bodySegmenterRef = useRef<BodySegmenter | null>(null);
  const faceSegmenterRef = useRef<FaceSegmenter | null>(null);
  const zoneCreatorRef = useRef<ZoneCreator | null>(null);

  // Initialize segmenters
  const initialize = useCallback(async () => {
    setError(null);

    try {
      // Initialize body segmenter (always needed for zone creation)
      if (!bodySegmenterRef.current) {
        bodySegmenterRef.current = new BodySegmenter();
      }
      await bodySegmenterRef.current.initialize();

      // Initialize face segmenter if needed
      if (mode === 'face' && !faceSegmenterRef.current) {
        faceSegmenterRef.current = new FaceSegmenter();
        await faceSegmenterRef.current.initialize();
      }

      // Initialize zone creator
      if (enableZones && !zoneCreatorRef.current) {
        zoneCreatorRef.current = new ZoneCreator();
      }

      setIsInitialized(true);
      console.log('Segmentation initialized successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize segmentation';
      setError(message);
      console.error('Segmentation initialization error:', err);
    }
  }, [mode, enableZones]);

  // Process a frame
  const processFrame = useCallback(
    async (
      input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
      timestamp?: number
    ) => {
      if (!isInitialized || isProcessing) return;

      setIsProcessing(true);

      try {
        // Body segmentation (always run for zones)
        if (bodySegmenterRef.current?.isReady()) {
          const bodyRes = await bodySegmenterRef.current.segment(input, timestamp);
          setBodyResult(bodyRes);

          // Create zones if enabled
          if (enableZones && zoneCreatorRef.current && bodyRes.bodyDetected) {
            const zones = zoneCreatorRef.current.createZones(bodyRes);
            setZoneData(zones);
          }
        }

        // Face segmentation if in face mode
        if (mode === 'face' && faceSegmenterRef.current?.isReady()) {
          const faceRes = await faceSegmenterRef.current.detect(input, timestamp);
          setFaceResult(faceRes);
        }
      } catch (err) {
        console.error('Segmentation error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [isInitialized, isProcessing, mode, enableZones]
  );

  // Handle mode change
  const handleSetMode = useCallback(
    async (newMode: AnalysisMode) => {
      setMode(newMode);

      // Initialize face segmenter if switching to face mode
      if (newMode === 'face' && !faceSegmenterRef.current?.isReady()) {
        try {
          faceSegmenterRef.current = new FaceSegmenter();
          await faceSegmenterRef.current.initialize();
        } catch (err) {
          console.error('Failed to initialize face segmenter:', err);
        }
      }
    },
    []
  );

  // Cleanup
  const close = useCallback(() => {
    bodySegmenterRef.current?.close();
    faceSegmenterRef.current?.close();
    bodySegmenterRef.current = null;
    faceSegmenterRef.current = null;
    zoneCreatorRef.current = null;
    setIsInitialized(false);
    setBodyResult(null);
    setFaceResult(null);
    setZoneData(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  return {
    bodyResult,
    faceResult,
    zoneData,
    isInitialized,
    isProcessing,
    error,
    initialize,
    processFrame,
    setMode: handleSetMode,
    close,
  };
}
