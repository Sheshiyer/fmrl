import { useCallback, useEffect, useState } from 'react';

export type CameraPermissionState =
  | 'checking'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error';

interface CameraPermissionResult {
  state: CameraPermissionState;
  error: string | null;
  checkPermission: () => Promise<CameraPermissionState>;
  requestPermission: () => Promise<CameraPermissionState>;
}

async function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

export function useCameraPermission(): CameraPermissionResult {
  const [state, setState] = useState<CameraPermissionState>('checking');
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback(async (): Promise<CameraPermissionState> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported');
        setError('Camera APIs are not available on this runtime.');
        return 'unsupported';
      }

      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (status.state === 'granted') {
            setState('granted');
            setError(null);
            return 'granted';
          }
          if (status.state === 'denied') {
            setState('denied');
            setError('Camera access is denied. Enable it in System Settings > Privacy & Security > Camera.');
            return 'denied';
          }
          setState('prompt');
          setError(null);
          return 'prompt';
        } catch {
          // fall through to prompt state when permissions API is unavailable/restricted
        }
      }

      setState('prompt');
      setError(null);
      return 'prompt';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check camera permission.';
      setState('error');
      setError(message);
      return 'error';
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<CameraPermissionState> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported');
        setError('Camera APIs are not available on this runtime.');
        return 'unsupported';
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      await stopTracks(stream);
      setState('granted');
      setError(null);
      return 'granted';
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        const deniedMsg = 'Camera access denied. Enable it in System Settings > Privacy & Security > Camera.';
        setState('denied');
        setError(deniedMsg);
        return 'denied';
      }

      const message = err instanceof Error ? err.message : 'Failed to request camera permission.';
      setState('error');
      setError(message);
      return 'error';
    }
  }, []);

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  return {
    state,
    error,
    checkPermission,
    requestPermission,
  };
}
