"use client";

import { useEffect, useRef, useCallback, useState, createContext, useContext } from "react";
import type { ReactNode } from "react";

type EventHandler = (data: any) => void;

interface RealtimeContextValue {
  subscribe: (event: string, handler: EventHandler) => () => void;
  send: (event: string, data: unknown) => void;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  url: string;
  userId: string;
  children: ReactNode;
}

export function RealtimeProvider({ url, userId, children }: RealtimeProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${url}?userId=${encodeURIComponent(userId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (evt) => {
      try {
        const { event, data } = JSON.parse(evt.data);
        const handlers = listenersRef.current.get(event);
        if (handlers) {
          for (const h of handlers) h(data);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 2s
      reconnectTimerRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }, [url, userId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);

    return () => {
      listenersRef.current.get(event)?.delete(handler);
    };
  }, []);

  const send = useCallback((event: string, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  return (
    <RealtimeContext value={{ subscribe, send, isConnected }}>
      {children}
    </RealtimeContext>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}

/** Subscribe to a realtime event — auto-cleans up */
export function useRealtimeEvent(event: string, handler: EventHandler) {
  const { subscribe } = useRealtime();

  useEffect(() => {
    return subscribe(event, handler);
  }, [event, handler, subscribe]);
}
