import { useEffect, useRef, useState } from 'react';
import type { GameEvent } from '../types/battle.js';

export function useGameEvents(displayId: string, onEvent: (event: GameEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<'ws' | 'sse' | 'disconnected'>('disconnected');
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let sse: EventSource | null = null;
    let isCleanedUp = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connectWs() {
      if (isCleanedUp) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?displayId=${encodeURIComponent(displayId)}`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isCleanedUp) {
            ws?.close();
            return;
          }
          setConnected(true);
          setTransport('ws');
          // Send explicit subscription message
          ws?.send(JSON.stringify({ action: 'subscribe', displayId }));
        };

        ws.onmessage = (event) => {
          try {
            const data: GameEvent = JSON.parse(event.data);
            if (data && data.type) {
              onEventRef.current(data);
            }
          } catch {
            // Ignore non-json
          }
        };

        ws.onerror = () => {
          // Fallback to SSE if WS fails
          if (!connected && !sse) {
            connectSse();
          }
        };

        ws.onclose = () => {
          setConnected(false);
          setTransport('disconnected');
          if (!isCleanedUp) {
            // Try reconnecting in 3 seconds
            reconnectTimer = setTimeout(() => {
              connectWs();
            }, 3000);
          }
        };
      } catch {
        connectSse();
      }
    }

    function connectSse() {
      if (isCleanedUp || sse) return;

      const sseUrl = `/api/v1/events/stream?displayId=${encodeURIComponent(displayId)}`;
      try {
        sse = new EventSource(sseUrl);

        sse.onopen = () => {
          if (isCleanedUp) {
            sse?.close();
            return;
          }
          setConnected(true);
          setTransport('sse');
        };

        sse.onmessage = (event) => {
          try {
            const data: GameEvent = JSON.parse(event.data);
            if (data && data.type) {
              onEventRef.current(data);
            }
          } catch {
            // Ignore
          }
        };

        sse.onerror = () => {
          setConnected(false);
          setTransport('disconnected');
        };
      } catch {
        // SSE error
      }
    }

    connectWs();

    return () => {
      isCleanedUp = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      if (sse) {
        sse.close();
      }
    };
  }, [displayId]);

  return { connected, transport };
}
