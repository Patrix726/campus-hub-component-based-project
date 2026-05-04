import { commentEvents } from "@repo/feature-comments/server";
import { postEvents } from "@repo/feature-posts/server";
import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

export function attachRealtime(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => {
      clients.delete(ws);
    });
    ws.on("error", () => {
      clients.delete(ws);
    });
  });

  const broadcast = (type: string, payload: unknown): void => {
    const msg = JSON.stringify({ type, payload });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(msg);
        } catch {
          clients.delete(client);
        }
      }
    }
  };

  postEvents.on("post:liked", (payload: unknown) => {
    broadcast("post:liked", payload);
  });

  commentEvents.on("comment:new", (payload: unknown) => {
    broadcast("comment:new", payload);
  });
}
