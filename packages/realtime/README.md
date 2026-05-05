# `@repo/realtime`

**IMPLEMENTED BY: [@Nahom](https://github.com/nahom-d54)**

Shared real-time infrastructure for the entire monorepo. Provides **one WebSocket server** for client-server communication and an **in-process event bus** for server-side cross-feature communication. All features (chat, notifications, and future domains) share this single layer without creating duplicate WebSocket connections.

---

## Table of Contents

- [Architecture](#architecture)
- [Server-Side (`@repo/realtime/server`)](#server-side-reporealtimeserver)
  - [RealtimeServer](#realtime-server)
  - [Lifecycle (init → get)](#server-lifecycle)
  - [emitToUsers / emitToUser](#emitting-events)
  - [Server-side listeners (on)](#server-side-listeners)
  - [User presence (isOnline)](#user-presence)
- [Client-Side (`@repo/realtime/client`)](#client-side-reporealtimeclient)
  - [RealtimeProvider](#realtimeprovider)
  - [useRealtime](#userealtime)
  - [useRealtimeEvent](#userealtimeevent)
- [Event Bus (`getEventBus`)](#event-bus-geteventbus)
  - [Cross-Feature Communication](#cross-feature-communication)
  - [Naming Convention](#naming-convention)
- [Event Namespacing](#event-namespacing)
- [Integration Guide](#integration-guide)
  - [In `apps/server`](#in-appsserver)
  - [In `apps/web`](#in-appsweb)
  - [In a feature package (server)](#in-a-feature-package-server)
  - [In a feature package (client)](#in-a-feature-package-client)
- [Dependencies](#dependencies)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            @repo/realtime                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  SERVER  (@repo/realtime/server)                                            │
│  ┌─────────────────┐                                                        │
│  │ RealtimeServer  │  ws.WebSocketServer on /ws (same HTTP server)          │
│  │  - userSockets  │  Map<userId, Set<WebSocket>>                           │
│  │  - listeners    │  Map<event, handler[]> for client-sent events          │
│  │  - emitToUsers  │  broadcast to specific users                           │
│  │  - on           │  register server-side handler for client events        │
│  └─────────────────┘                                                        │
│        │                                                                    │
│  ┌─────────────────┐                                                        │
│  │  EventBus       │  Node.js EventEmitter — in-process only                │
│  │  - emitInternal │  cross-feature communication (no network hop)          │
│  │  - onInternal   │  no import coupling between feature packages           │
│  └─────────────────┘                                                        │
│                                                                             │
│  CLIENT  (@repo/realtime/client)                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ RealtimeProvider                                                     │   │
│  │   - Manages WebSocket connection (auto-connect on mount)             │   │
│  │   - Auto-reconnects after 2s on disconnect                           │   │
│  │   - Cleans up on unmount                                             │   │
│  │   - Provides subscribe/send/isConnected via React Context            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│        │                                                                    │
│  ┌─────────────────┐  ┌────────────────────┐                                │
│  │ useRealtime()   │  │ useRealtimeEvent() │                                │
│  │ - subscribe()   │  │ declarative hook   │                                │
│  │ - send()        │  │ auto-cleans up     │                                │
│  │ - isConnected   │  └────────────────────┘                                │
│  └─────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Server-Side (`@repo/realtime/server`)

```ts
import { initRealtimeServer, getRealtimeServer, getEventBus } from "@repo/realtime/server";
```

### RealtimeServer

The `RealtimeServer` class wraps `ws.WebSocketServer` and provides user-scoped event broadcasting.

**Connection flow:**

1. Client opens `ws://host/ws?userId={userId}`
2. Server extracts `userId` from the query string
3. The WebSocket is added to `userSockets.get(userId)`
4. Incoming messages are parsed as `{ event, data }` and dispatched to registered `listeners`
5. On close, the socket is removed from the user's set

> **Note on auth:** The `userId` comes from the query string. In production, validate the session (e.g. via Better-Auth cookie or bearer token) **before** the WebSocket upgrade completes.

---

### Server Lifecycle

```ts
import { createServer } from "http";
import express from "express";
import { initRealtimeServer } from "@repo/realtime/server";

const app = express();
const server = createServer(app);

// 1. Start HTTP server
server.listen(3000, () => console.log("HTTP on :3000"));

// 2. Initialize WebSocket (must be after server.listen)
initRealtimeServer(server);

// 3. Later, anywhere in server code, get the singleton:
import { getRealtimeServer } from "@repo/realtime/server";
const rt = getRealtimeServer();
rt.emitToUser("user-123", "notification:new", { id: "n1", type: "chat_message" });
```

**Important:** `initRealtimeServer` must be called exactly once. Calling `getRealtimeServer()` before initialization throws an error.

---

### Emitting Events

| Method | Signature | Use Case |
|--------|-----------|----------|
| `emitToUsers` | `(userIds: string[], event: string, data: any)` | Send to multiple users (e.g. all chat participants) |
| `emitToUser` | `(userId: string, event: string, data: any)` | Send to a single user (e.g. notification recipient) |

Both serialize the payload as `{ event, data }` and send to every open socket for each user. A user may have multiple sockets (multiple tabs/devices).

---

### Server-Side Listeners

Register handlers for events **sent from the client** over WebSocket:

```ts
const rt = getRealtimeServer();

rt.on("chat:typing", async (data, userId) => {
  // data = { chatId, userName }
  // userId = the sender's userId (from query param)
  console.log(`${userId} is typing in ${data.chatId}`);
});
```

These are stored in `listeners: Map<string, handler[]>` and called when a client sends `{ event: "chat:typing", data: ... }`.

---

### User Presence

```ts
const rt = getRealtimeServer();
rt.isOnline("user-123"); // boolean
```

Checks whether a user has any open WebSocket connections.

---

## Client-Side (`@repo/realtime/client`)

```ts
import { RealtimeProvider, useRealtime, useRealtimeEvent } from "@repo/realtime/client";
```

### RealtimeProvider

Wrap your app (or a subtree) with the provider. It manages the WebSocket lifecycle.

```tsx
// apps/web/app/layout.tsx
import { RealtimeProvider } from "@repo/realtime/client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const userId = "user-123"; // from auth session
  return (
    <RealtimeProvider url="ws://localhost:3000/ws" userId={userId}>
      {children}
    </RealtimeProvider>
  );
}
```

**Features:**
- Opens WebSocket on mount: `ws://url?userId={userId}`
- Auto-reconnects with 2-second delay after any disconnect/error
- Closes cleanly on unmount
- Exposes `subscribe(event, handler)`, `send(event, data)`, and `isConnected` via React Context

---

### useRealtime

Low-level hook for subscribing and sending events.

```tsx
function MyComponent() {
  const { subscribe, send, isConnected } = useRealtime();

  useEffect(() => {
    const unsub = subscribe("chat:message", (data) => {
      console.log("New message:", data);
    });
    return unsub; // auto-cleanup
  }, [subscribe]);

  const handleClick = () => {
    send("chat:typing", { chatId: "chat-1", userName: "Alice" });
  };

  return <div>{isConnected ? "Online" : "Reconnecting..."}</div>;
}
```

---

### useRealtimeEvent

Declarative hook for a single event. Automatically subscribes on mount and unsubscribes on unmount.

```tsx
import { useRealtimeEvent } from "@repo/realtime/client";

function ChatMessages({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState([]);

  useRealtimeEvent("chat:message", useCallback((data) => {
    if (data.chatId === chatId) {
      setMessages((prev) => [...prev, data.message]);
    }
  }, [chatId]));

  // ...
}
```

**Prefer `useRealtimeEvent`** over manual `subscribe` in components — it handles cleanup automatically.

---

## Event Bus (`getEventBus`)

The event bus is a **server-side only**, **in-process** `EventEmitter` used for **cross-feature communication**. It is **never** exposed over WebSocket to clients.

```ts
import { getEventBus } from "@repo/realtime/server";
```

### Cross-Feature Communication

This is the **decoupling mechanism** that prevents circular imports between feature packages.

```
┌──────────────────────┐          internal:notification:create         ┌──────────────────────────┐
│  feature-chat        │ ──────────────────────────────────────────────> │  feature-notifications   │
│  (server controller) │            (in-process EventBus)                │  (event bus listener)              │
└──────────────────────┘                                             ┌───>│                          │
                                                                     │    └──────────────────────────┘
┌──────────────────────┐          internal:notification:create         │
│  feature-events      │ ──────────────────────────────────────────┘
│  (server controller)   │            (same EventBus — no imports needed)
└──────────────────────┘
```

**Example:**

```ts
// In feature-chat (or any feature):
import { getEventBus } from "@repo/realtime/server";

const bus = getEventBus();
bus.emitInternal("internal:notification:create", {
  userId: "recipient-id",
  type: "chat_message",
  data: { chatId: "c1", messageId: "m1", senderName: "Alice", content: "Hi!" },
});
```

```ts
// In feature-notifications (registered once at server startup):
import { getEventBus } from "@repo/realtime/server";
import * as notificationService from "./services";

export function registerNotificationListeners() {
  const bus = getEventBus();
  bus.onInternal("internal:notification:create", async (payload) => {
    await notificationService.createNotification(
      payload.userId,
      payload.type,
      payload.data
    );
  });
}
```

### Naming Convention

Event bus events must be namespaced as:

```
internal:<feature>:<action>
```

Examples:
- `internal:notification:create` — request to create a notification
- `internal:analytics:track` — request to track an analytics event
- `internal:email:send` — request to send an email

**Why prefix with `internal:`?** To clearly distinguish bus events from WebSocket events and prevent accidental client exposure.

---

## Event Namespacing

All WebSocket events (client ↔ server) follow the convention:

```
<feature>:<action>
```

| Event | Source | Purpose |
|-------|--------|---------|
| `chat:message` | Server → Client | New message in a chat |
| `chat:typing` | Client → Server | User is typing |
| `chat:typing` | Server → Client | Broadcast typing to other participants |
| `notification:new` | Server → Client | New notification for the user |

This prevents collisions between features and keeps the shared WebSocket layer organized.

---

## Integration Guide

### In `apps/server`

```ts
// apps/server/src/index.ts
import express from "express";
import { createServer } from "http";
import { initRealtimeServer, getRealtimeServer } from "@repo/realtime/server";
import { chatRoutes, registerChatRealtimeHandlers } from "@repo/feature-chat/server";
import { notificationRoutes, registerNotificationListeners } from "@repo/feature-notifications/server";

const app = express();
app.use(chatRoutes);
app.use(notificationRoutes);

const server = createServer(app);
server.listen(3000, () => console.log("Server on :3000"));

// 1. Initialize WebSocket layer
initRealtimeServer(server);

// 2. Register feature realtime handlers
registerChatRealtimeHandlers();       // handles chat:typing from clients
registerNotificationListeners();      // listens on internal event bus

// 3. Direct emission example
app.post("/api/some-route", (req, res) => {
  const rt = getRealtimeServer();
  rt.emitToUser(req.body.userId, "notification:new", { message: "Hello!" });
  res.json({ ok: true });
});
```

### In `apps/web`

```tsx
// apps/web/app/layout.tsx (or a client wrapper)
"use client";
import { RealtimeProvider } from "@repo/realtime/client";

export default function App({ children, userId }: { children: React.ReactNode; userId: string }) {
  return (
    <RealtimeProvider
      url={process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000/ws"}
      userId={userId}
    >
      {children}
    </RealtimeProvider>
  );
}
```

```tsx
// Any component in apps/web
"use client";
import { useRealtimeEvent } from "@repo/realtime/client";

export function NotificationListener() {
  useRealtimeEvent("notification:new", (notification) => {
    toast.info(notification.data);
  });
  return null;
}
```

### In a feature package (server)

```ts
// packages/feature-chat/server/realtime.ts
import { getRealtimeServer } from "@repo/realtime/server";
import * as chatService from "./services";

export function registerChatRealtimeHandlers() {
  const rt = getRealtimeServer();

  rt.on("chat:typing", async (data, userId) => {
    const { chatId, userName } = data;
    const isMember = await chatService.isParticipant(chatId, userId);
    if (!isMember) return;

    const otherIds = await chatService.getOtherParticipantIds(chatId, userId);
    rt.emitToUsers(otherIds, "chat:typing", { chatId, userId, userName });
  });
}
```

```ts
// packages/feature-notifications/server/listener.ts
import { getEventBus } from "@repo/realtime/server";
import * as notificationService from "./services";

export function registerNotificationListeners() {
  const bus = getEventBus();
  bus.onInternal("internal:notification:create", async (payload) => {
    await notificationService.createNotification(payload.userId, payload.type, payload.data);
  });
}
```

### In a feature package (client)

```tsx
// packages/feature-chat/client/useMessages.ts
"use client";
import { useState, useCallback } from "react";
import { useRealtimeEvent } from "@repo/realtime/client";

export function useMessages(chatId: string, userId: string) {
  const [messages, setMessages] = useState([]);

  useRealtimeEvent("chat:message", useCallback((data) => {
    if (data.chatId === chatId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    }
  }, [chatId]));

  // ...fetch initial messages, sendMessage, etc.
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `ws` | WebSocket server (`WebSocketServer`, `WebSocket`) |
| `react` | Client-side React Context + hooks |

**No dependencies on:** `@repo/feature-chat`, `@repo/feature-notifications`, `@repo/auth`, `@repo/db`. This package is intentionally **leaf-level infrastructure** that other packages depend on, not the reverse.

---

## Complete API Reference

### Server Exports

| Export | Type | Description |
|--------|------|-------------|
| `initRealtimeServer(server)` | `function` | Singleton initializer. Attach `ws.WebSocketServer` to an existing `http.Server`. |
| `getRealtimeServer()` | `function` | Returns the initialized `RealtimeServer` instance. Throws if not initialized. |
| `RealtimeServer` | `class` | WebSocket server with user tracking, event emission, and listener registration. |
| `getEventBus()` | `function` | Returns the singleton `InternalEventBus` (Node.js EventEmitter). |

### RealtimeServer Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `emitToUsers` | `(userIds: string[], event: string, data: any)` | Broadcast event to all sockets of specified users. |
| `emitToUser` | `(userId: string, event: string, data: any)` | Convenience wrapper for single-user emission. |
| `on` | `(event: string, handler: (data: any, userId: string) => void \| Promise<void>)` | Register a server-side listener for client-sent WebSocket events. |
| `isOnline` | `(userId: string) => boolean` | Check if a user has any active WebSocket connections. |

### Client Exports

| Export | Type | Description |
|--------|------|-------------|
| `RealtimeProvider` | `React.FC<{ url: string; userId: string; children: ReactNode }>` | Context provider managing WebSocket lifecycle. |
| `useRealtime()` | `hook` | Returns `{ subscribe, send, isConnected }`. |
| `useRealtimeEvent(event, handler)` | `hook` | Declarative event subscription with automatic cleanup. |

### Event Bus Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `emitInternal` | `(event: string, payload: any) => void` | Emit an event on the server-side event bus. |
| `onInternal` | `(event: string, handler: (payload: any) => void \| Promise<void>) => void` | Listen for events on the server-side event bus. |

---

## Usage Checklist

When building a new feature package that needs real-time:

1. **Add `@repo/realtime` as a dependency** in `package.json`
2. **Client:** Import `useRealtimeEvent` and subscribe to your feature's events (e.g. `myfeature:update`)
3. **Server:** Import `getRealtimeServer` and call `emitToUsers` / `emitToUser` when data changes
4. **Server (optional):** Import `getEventBus` and `emitInternal` to trigger notifications or other cross-feature side effects
5. **Server (optional):** Call `rt.on("myfeature:action", handler)` if clients send events to the server
6. **In `apps/server`:** Import and call any `register*RealtimeHandlers()` functions from your feature
7. **In `apps/web`:** Ensure `RealtimeProvider` is mounted high in the tree with the authenticated user's `userId`
