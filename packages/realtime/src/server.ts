import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

export type RealtimeEvent = {
  event: string;
  data: unknown;
};

type AuthenticatedSocket = WebSocket & { userId?: string };

/**
 * Shared realtime server — ONE WebSocket system for the entire app.
 * Features communicate through event namespacing: <feature>:<action>
 */
export class RealtimeServer {
  private wss: WebSocketServer;
  private userSockets: Map<string, Set<AuthenticatedSocket>> = new Map();
  private listeners: Map<string, ((data: unknown, userId: string) => void)[]> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: AuthenticatedSocket, req) => {
      // Extract userId from query string — auth middleware already validated the session
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const userId = url.searchParams.get("userId");

      if (!userId) {
        ws.close(4001, "Missing userId");
        return;
      }

      ws.userId = userId;

      // Track connection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(ws);

      // Handle incoming messages from client
      ws.on("message", (raw) => {
        try {
          const { event, data } = JSON.parse(raw.toString()) as RealtimeEvent;
          const handlers = this.listeners.get(event);
          if (handlers) {
            for (const handler of handlers) {
              handler(data, userId);
            }
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.on("close", () => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) this.userSockets.delete(userId);
        }
      });
    });
  }

  /** Emit an event to specific users */
  emitToUsers(userIds: string[], event: string, data: unknown): void {
    const payload = JSON.stringify({ event, data });
    for (const uid of userIds) {
      const sockets = this.userSockets.get(uid);
      if (sockets) {
        for (const ws of sockets) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        }
      }
    }
  }

  /** Emit an event to a single user */
  emitToUser(userId: string, event: string, data: unknown): void {
    this.emitToUsers([userId], event, data);
  }

  /** Register a server-side listener for client-sent events */
  on(event: string, handler: (data: unknown, userId: string) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /** Check if a user is currently connected */
  isOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}

let instance: RealtimeServer | null = null;

export function initRealtimeServer(server: Server): RealtimeServer {
  if (!instance) {
    instance = new RealtimeServer(server);
  }
  return instance;
}

export function getRealtimeServer(): RealtimeServer {
  if (!instance) throw new Error("RealtimeServer not initialized. Call initRealtimeServer first.");
  return instance;
}

export { getEventBus } from "./event-bus";
