# `@repo/feature-notifications`

** IMPLEMENTED BY: [@Nahom](https://github.com/nahom-d54) **

Push notification system with real-time delivery. Provides client-side UI components, a notification API, and event bus integration for cross-feature notification creation.

---

## Table of Contents

- [Architecture](#architecture)
- [Exports](#exports)
- [Client-Side](#client-side)
  - [useNotifications](#usenotifications)
  - [NotificationBell](#notificationbell)
  - [NotificationDropdown](#notificationdropdown)
  - [UnreadBadge](#unreadbadge)
- [Server-Side](#server-side)
  - [Routes](#routes)
  - [Controllers](#controllers)
  - [Services](#services)
  - [Event Bus Listener](#event-bus-listener)
- [Cross-Feature Integration](#cross-feature-integration)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       @repo/feature-notifications                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  client/                                                                    │
│  ├── useNotifications.ts   Hook: fetch, mark read, realtime sync             │
│  ├── NotificationBell.tsx  UI: bell icon + dropdown toggle                  │
│  ├── NotificationDropdown.tsx UI: scrollable list of notifications            │
│  └── UnreadBadge.tsx       UI: red dot counter                               │
│                                                                              │
│  server/                                                                    │
│  ├── routes.ts             Express router: /api/notifications/*               │
│  ├── controller.ts         Request handlers (list, mark read)                │
│  ├── services.ts           Prisma DB operations + realtime push               │
│  └── listener.ts           Event bus listener registration                    │
│                                                                              │
│  shared/                                                                    │
│  └── index.ts              (reserved for future types/schemas)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Exports

```ts
// Full barrel
import { useNotifications, NotificationBell, NotificationDropdown, UnreadBadge } from "@repo/feature-notifications";
import { notificationRoutes, registerNotificationListeners, createNotification } from "@repo/feature-notifications";

// Or import selectively by subpath
import { useNotifications, NotificationBell } from "@repo/feature-notifications/client";
import { notificationRoutes, registerNotificationListeners } from "@repo/feature-notifications/server";
```

---

## Client-Side

### `useNotifications(userId: string)`

Hook for managing the current user's notification feed.

**State:**
- `notifications: Notification[]` — list of notifications, newest first
- `unreadCount: number` — count of unread notifications
- `loading, error` — async status

**Actions:**
- `markAsRead(notificationId: string)` — PATCH to server, updates local state optimistically
- `refetch()` — manual re-fetch

**Realtime integration:**
- Subscribes to `notification:new` events via `useRealtimeEvent`
- Deduplicates by `notification.id`
- Increments `unreadCount` on each new notification

---

### `NotificationBell`

Bell icon button with unread count badge. Clicking opens a dropdown card.

```tsx
<NotificationBell userId={userId} />
```

**Features:**
- SVG bell icon (Lucide-style)
- `UnreadBadge` overlay with red dot + count
- Dropdown card with header + scrollable `NotificationDropdown`
- Closes on outside click

---

### `NotificationDropdown`

Scrollable list of notifications inside the dropdown card.

**Features:**
- Parses `notification.data` JSON to render human-readable text
- Supports types: `chat_message`, `post_like`, `event_invite`
- Shows relative timestamp
- Unread items highlighted with amber tint + dot indicator
- Clicking an unread item marks it as read
- Empty state: "No notifications"

**Message rendering by type:**

| Type | Display Text |
|------|-------------|
| `chat_message` | `senderName: content` (truncated to 100 chars) |
| `post_like` | "Someone liked your post" |
| `event_invite` | "You've been invited to an event" |
| default | "New notification" |

---

### `UnreadBadge`

Small red circular badge. Shows count up to 99, then "99+". Hidden when count is 0.

```tsx
<UnreadBadge count={5} />
```

---

## Server-Side

### Routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/notifications?userId={userId}&unreadOnly={true}&limit=50` | `listNotifications` | List notifications for a user |
| PATCH | `/api/notifications/:id/read?userId={userId}` | `markAsRead` | Mark a notification as read |

**Auth:** All endpoints expect `userId` as a query parameter. In production, replace with session middleware.

---

### Controllers

- **`listNotifications`** — validates `userId`, supports `unreadOnly` and `limit` query params; returns `{ notifications, unreadCount }`
- **`markAsRead`** — validates `userId` and notification `id`; updates `read: true` scoped to the requesting user

---

### Services

All database operations use `@repo/db` (Prisma Client + LibSQL adapter).

- **`createNotification(userId, type, data)`** — persists to DB, then emits `notification:new` over WebSocket. If realtime is unavailable, notification still persists.
- **`listNotifications(userId, limit?, unreadOnly?)`** — `findMany` ordered by `createdAt` desc
- **`markAsRead(notificationId, userId)`** — `prisma.notification.update` scoped to owner
- **`getUnreadCount(userId)`** — `prisma.notification.count` where `read: false`

---

### Event Bus Listener

The **critical integration point** for cross-feature communication.

```ts
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

**Why this matters:**
- `feature-chat` (or any future feature) never imports `feature-notifications`
- It simply emits `internal:notification:create` on the shared event bus
- This listener picks it up, persists the notification, and pushes it to the user via WebSocket
- The event bus is **in-process only** — never exposed over the network

**Startup registration:**

```ts
// apps/server/src/index.ts
import { registerNotificationListeners } from "@repo/feature-notifications/server";

registerNotificationListeners(); // called once at server boot
```

---

## Cross-Feature Integration

### How Chat creates Notifications

When `feature-chat` sends a message:

```ts
// In chat sendMessage controller:
const bus = getEventBus();
for (const recipientId of recipientIds) {
  bus.emitInternal("internal:notification:create", {
    userId: recipientId,
    type: "chat_message",
    data: {
      chatId,
      messageId: message.id,
      senderName: message.sender.name,
      content: content.substring(0, 100),
    },
  });
}
```

This triggers the notification listener, which:
1. Creates a `Notification` record in the database
2. Emits `notification:new` over WebSocket to the recipient's connected clients
3. The recipient's `useNotifications` hook receives it and updates the UI

### Future Features

Any new feature package can send notifications without importing this package:

```ts
import { getEventBus } from "@repo/realtime/server";

const bus = getEventBus();
bus.emitInternal("internal:notification:create", {
  userId: targetUserId,
  type: "my_feature_event",
  data: { /* any serializable data */ },
});
```

---

## Database Schema

### `Notification`

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // e.g. "chat_message", "post_like", "event_invite"
  data      String   // JSON-encoded payload
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## API Reference

### GET `/api/notifications?userId={userId}&unreadOnly={true|false}&limit={n}`

**Response:**
```json
{
  "notifications": [
    {
      "id": "cmxxx",
      "userId": "user1",
      "type": "chat_message",
      "data": "{\"chatId\":\"cmxxx\",\"senderName\":\"Alice\",\"content\":\"Hello!\"}",
      "read": false,
      "createdAt": "2025-05-05T..."
    }
  ],
  "unreadCount": 3
}
```

### PATCH `/api/notifications/:id/read?userId={userId}`

**Response:** Updated `Notification` object with `read: true`.

---

## WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `notification:new` | Server → Client | `Notification` object | New notification for the user |

The client subscribes via:

```ts
useRealtimeEvent("notification:new", (data) => {
  // data is the full Notification record
});
```

---

## Usage Example

```tsx
// apps/web/app/layout.tsx (or header)
import { NotificationBell } from "@repo/feature-notifications/client";

export default function Header({ userId }: { userId: string }) {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>CampusHub</h1>
      <NotificationBell userId={userId} />
    </header>
  );
}
```

```ts
// apps/server/src/index.ts
import { notificationRoutes, registerNotificationListeners } from "@repo/feature-notifications/server";

app.use(notificationRoutes);
registerNotificationListeners();
```

```ts
// Any other feature creating a notification:
import { getEventBus } from "@repo/realtime/server";

const bus = getEventBus();
bus.emitInternal("internal:notification:create", {
  userId: "target-user-id",
  type: "event_invite",
  data: { eventId: "evt-123", eventName: "Campus Fair" },
});
```
