/**
 * Custom hook for WebSocket connection
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { WSMessage, WSMetricsPayload } from '../types';

interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WSMessage) => void;
  onMetrics?: (payload: WSMetricsPayload) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  clientId: string | null;
  connect: () => void;
  disconnect: () => void;
  send: (message: WSMessage) => void;
  sendFrame: (frameData: string, timestamp: number) => void;
  startSession: (settings?: Record<string, unknown>) => void;
  endSession: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    autoConnect = false,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onMetrics,
    onError,
    onOpen,
    onClose,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const connectRef = useRef<() => void>(() => {});
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
        
        // Send auth message
        wsRef.current?.send(JSON.stringify({ type: 'auth' }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          // Handle auth success
          if (message.type === 'auth_success') {
            setClientId((message.payload as { client_id: string })?.client_id || null);
          }
          
          // Handle metrics
          if (message.type === 'metrics' && onMetrics) {
            onMetrics(message.payload as WSMetricsPayload);
          }
          
          // General message handler
          onMessage?.(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (event) => {
        setError('WebSocket error');
        onError?.(event);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        onClose?.();
        
        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, reconnectInterval);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
    }
  }, [url, onOpen, onClose, onMessage, onMetrics, onError, reconnectInterval, maxReconnectAttempts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent reconnect
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setClientId(null);
  }, [maxReconnectAttempts]);

  // Send a message
  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  // Send a frame for analysis
  const sendFrame = useCallback((frameData: string, timestamp: number) => {
    send({
      type: 'frame',
      payload: {
        timestamp,
        frame_data: frameData,
      },
    });
  }, [send]);

  // Start an analysis session
  const startSession = useCallback((settings?: Record<string, unknown>) => {
    send({
      type: 'session_start',
      payload: { settings },
    });
  }, [send]);

  // End the current session
  const endSession = useCallback(() => {
    send({ type: 'session_end' });
  }, [send]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      const timer = setTimeout(() => {
        connectRef.current();
      }, 0);
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    clientId,
    connect,
    disconnect,
    send,
    sendFrame,
    startSession,
    endSession,
  };
}
