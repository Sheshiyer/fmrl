/**
 * Custom hook for WebRTC camera access
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CameraDevice } from '../types';

interface UseCameraOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  deviceId?: string;
}

interface UseCameraReturn {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  devices: CameraDevice[];
  selectedDevice: string | null;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  selectDevice: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
}

const DEFAULT_OPTIONS: UseCameraOptions = {
  width: 640,
  height: 480,
  facingMode: 'user',
};

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(opts.deviceId || null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Enumerate available video devices
  const refreshDevices = useCallback(async () => {
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: 'videoinput' as const,
        }));
      setDevices(videoDevices);
      
      // Set default device if not selected
      if (!selectedDevice && videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, [selectedDevice]);

  // Start camera stream
  const start = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: opts.width },
          height: { ideal: opts.height },
          facingMode: opts.facingMode,
          ...(selectedDevice && { deviceId: { exact: selectedDevice } }),
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setIsPlaying(true);
      }
      
      // Refresh devices after getting permission
      await refreshDevices();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      console.error('Camera error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [opts.width, opts.height, opts.facingMode, selectedDevice, stream, refreshDevices]);

  // Stop camera stream
  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPlaying(false);
  }, [stream]);

  // Pause video
  const pause = useCallback(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Resume video
  const resume = useCallback(() => {
    if (videoRef.current && !isPlaying && stream) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, stream]);

  // Select a different camera
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Restart stream when device changes
  useEffect(() => {
    if (stream && selectedDevice) {
      start();
    }
  }, [selectedDevice, start, stream]);

  // Initial device enumeration
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    stream,
    videoRef,
    isPlaying,
    isLoading,
    error,
    devices,
    selectedDevice,
    start,
    stop,
    pause,
    resume,
    selectDevice,
    refreshDevices,
  };
}
