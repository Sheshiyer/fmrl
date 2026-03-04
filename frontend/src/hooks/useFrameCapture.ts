/**
 * Hook for capturing frames and sending to backend for analysis
 */
import { useState, useCallback, useRef } from 'react';
import type { AnalysisResult, AnalysisMode, PIPSettings } from '../types';
import { ensureBackendReady } from '../utils/runtimeApi';

interface CaptureOptions {
  mode?: AnalysisMode;
  pipSettings?: Partial<PIPSettings>;
  includeSegmentation?: boolean;
}

interface UseFrameCaptureReturn {
  capture: (canvas: HTMLCanvasElement, options?: CaptureOptions) => Promise<AnalysisResult | null>;
  isCapturing: boolean;
  lastResult: AnalysisResult | null;
  error: string | null;
  progress: number;
}

export function useFrameCapture(): UseFrameCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const capture = useCallback(
    async (
      canvas: HTMLCanvasElement,
      options: CaptureOptions = {}
    ): Promise<AnalysisResult | null> => {
      if (isCapturing) {
        console.warn('Capture already in progress');
        return null;
      }

      setIsCapturing(true);
      setError(null);
      setProgress(0);

      try {
        // Cancel any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setProgress(10);

        // Capture canvas as blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to capture canvas'));
            },
            'image/png',
            1.0
          );
        });

        setProgress(30);

        // Create form data
        const formData = new FormData();
        formData.append('image', blob, 'capture.png');
        formData.append('mode', options.mode || 'fullBody');

        if (options.pipSettings) {
          formData.append('pip_settings', JSON.stringify(options.pipSettings));
        }

        setProgress(50);

        // Resolve runtime backend URL and ensure backend readiness
        const readiness = await ensureBackendReady();
        if (!readiness.ready) {
          throw new Error(readiness.error || 'Backend is not ready yet');
        }

        // Send to backend
        const response = await fetch(`${readiness.baseUrl}/api/v1/analysis/capture`, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        setProgress(80);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        const result: AnalysisResult = await response.json();

        setProgress(100);
        setLastResult(result);

        return result;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Capture aborted');
          return null;
        }

        const message = err instanceof Error ? err.message : 'Capture failed';
        setError(message);
        console.error('Frame capture error:', err);
        return null;
      } finally {
        setIsCapturing(false);
        abortControllerRef.current = null;
      }
    },
    [isCapturing]
  );

  return {
    capture,
    isCapturing,
    lastResult,
    error,
    progress,
  };
}
