import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';

export function useTelemetry() {
  const { token, isAuthenticated } = useAuthStore();
  const [metrics, setMetrics] = useState<any>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = () => {
    if (!token || !isAuthenticated) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/system/ws/telemetry?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMetrics(data);
      } catch (err) {
        console.error('Error parsing telemetry metrics JSON', err);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      // Attempt auto reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('Telemetry WebSocket error:', err);
      ws.close();
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        // Remove close and error listeners to prevent loop/errors during clean unmount
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, isAuthenticated]);

  return { metrics, status };
}
