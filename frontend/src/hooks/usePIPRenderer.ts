/**
 * Custom hook for PIP Renderer
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { PIPRenderer } from '../services/PIPRenderer';
import type { PIPSettings } from '../types';
import { DEFAULT_PIP_SETTINGS } from '../types';

interface UsePIPRendererOptions {
  autoStart?: boolean;
}

interface UsePIPRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  renderer: PIPRenderer | null;
  isRunning: boolean;
  settings: PIPSettings;
  init: (video: HTMLVideoElement) => Promise<void>;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setParameter: <K extends keyof PIPSettings>(name: K, value: PIPSettings[K]) => void;
  loadPreset: (preset: Partial<PIPSettings>) => void;
  captureFrame: () => ImageData | null;
  captureFrameAsDataURL: () => string | null;
}

export function usePIPRenderer(options: UsePIPRendererOptions = {}): UsePIPRendererReturn {
  const { autoStart = true } = options;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PIPRenderer | null>(null);
  const [renderer, setRenderer] = useState<PIPRenderer | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [settings, setSettings] = useState<PIPSettings>(DEFAULT_PIP_SETTINGS);

  // Initialize renderer
  const init = useCallback(async (video: HTMLVideoElement) => {
    if (!canvasRef.current) {
      throw new Error('Canvas ref not available');
    }

    // Clean up existing renderer
    if (rendererRef.current) {
      rendererRef.current.destroy();
    }

    // Create new renderer
    const renderer = new PIPRenderer(canvasRef.current);
    await renderer.init();
    renderer.setVideoSource(video);
    rendererRef.current = renderer;
    setRenderer(renderer);

    // Apply current settings
    Object.entries(settings).forEach(([key, value]) => {
      renderer.setParameter(key as keyof PIPSettings, value);
    });

    if (autoStart) {
      renderer.start();
      setIsRunning(true);
    }
  }, [settings, autoStart]);

  // Start renderer
  const start = useCallback(() => {
    if (rendererRef.current && !isRunning) {
      rendererRef.current.start();
      setIsRunning(true);
    }
  }, [isRunning]);

  // Stop renderer
  const stop = useCallback(() => {
    if (rendererRef.current && isRunning) {
      rendererRef.current.stop();
      setIsRunning(false);
    }
  }, [isRunning]);

  // Pause renderer
  const pause = useCallback(() => {
    if (rendererRef.current && isRunning) {
      rendererRef.current.pause();
      setIsRunning(false);
    }
  }, [isRunning]);

  // Resume renderer
  const resume = useCallback(() => {
    if (rendererRef.current && !isRunning) {
      rendererRef.current.resume();
      setIsRunning(true);
    }
  }, [isRunning]);

  // Set a single parameter
  const setParameter = useCallback(<K extends keyof PIPSettings>(
    name: K,
    value: PIPSettings[K]
  ) => {
    if (rendererRef.current) {
      rendererRef.current.setParameter(name, value);
    }
    setSettings((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Load a preset
  const loadPreset = useCallback((preset: Partial<PIPSettings>) => {
    if (rendererRef.current) {
      rendererRef.current.loadPreset(preset);
    }
    setSettings((prev) => ({ ...prev, ...preset }));
  }, []);

  // Capture current frame as ImageData
  const captureFrame = useCallback((): ImageData | null => {
    if (rendererRef.current) {
      return rendererRef.current.captureFrame();
    }
    return null;
  }, []);

  // Capture current frame as data URL
  const captureFrameAsDataURL = useCallback((): string | null => {
    if (rendererRef.current) {
      return rendererRef.current.captureFrameAsDataURL();
    }
    return null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
      setRenderer(null);
    };
  }, []);

  return {
    canvasRef,
    renderer,
    isRunning,
    settings,
    init,
    start,
    stop,
    pause,
    resume,
    setParameter,
    loadPreset,
    captureFrame,
    captureFrameAsDataURL,
  };
}
