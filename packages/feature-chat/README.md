# `@repo/feature-chat`

** IMPLEMENTED BY: [@Nahom](https://github.com/nahom-d54) **

Real-time chat and messaging feature package. Provides everything needed for 1-to-1 and group conversations: client-side hooks/components, REST API endpoints, and WebSocket integration via `@repo/realtime`.

---

## Table of Contents

- [Architecture](#architecture)
- [Exports](#exports)
- [Client-Side](#client-side)
  - [useChats](#usechats)
  - [useMessages](#usemessages)
  - [ChatList](#chatlist)
  - [ChatWindow](#chatwindow)
  - [MessageInput](#messageinput)
- [Server-Side](#server-side)
  - [Routes](#routes)
  - [Controllers](#controllers)
  - [Services](#services)
  - [Realtime Handlers](#realtime-handlers)
- [Cross-Feature Integration](#cross-feature-integration)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           @repo/feature-chat                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  client/                                                                    │
│  ├── useChats.ts        Hook: fetch chat list, create chat, realtime sync   │
│  ├── useMessages.ts     Hook: fetch messages, send, typing indicators       │
│  ├── ChatList.tsx       UI: scrollable list of conversations                │
│  ├── ChatWindow.tsx     UI: message thread with auto-scroll                   │
│  └── MessageInput.tsx   UI: text input + send button                        │
│                                                                              │
│  server/                                                                    │
│  ├── routes.ts          Express router: /api/chat/*                           │
│  ├── controller.ts      Request handlers (list, create, messages, send)     │
│  ├── services.ts      Prisma DB operations + business logic                  │
│  └── realtime.ts      WebSocket handler registration (typing)                │
│                                                                              │
│  shared/                                                                    │
│  └── index.ts           (reserved for future types/schemas)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Exports

```ts
// Full barrel
import { useChats, useMessages, ChatList, ChatWindow, MessageInput } from "@repo/feature-chat";
import { chatRoutes, registerChatRealtimeHandlers } from "@repo/feature-chat";

// Or import selectively by subpath
import { useChats, ChatList } from "@repo/feature-chat/client";
import { chatRoutes, registerChatRealtimeHandlers } from "@repo/feature-chat/server";
```

---

## Client-Side

### `useChats(userId: string)`

Hook for managing the user's conversation list.

**State:**
- `chats: ChatSummary[]` — list of conversations with participants and last message
- `loading, error` — async status

**Actions:**
- `createChat(participantIds, name?, isGroup?)` — creates a new chat (1-to-1 or group)
- `refetch()` — manual re-fetch

**Realtime integration:**
- Subscribes to `chat:message` events via `useRealtimeEvent`
- When a new message arrives, updates the matching chat's `lastMessage` and moves it to the top
- If the chat is unknown, triggers a full refetch

**1-to-1 deduplication:** Calling `createChat` with two participants where `isGroup=false` will return the existing chat if one already exists between those users.

---

### `useMessages(chatId: string, userId: string)`

Hook for managing messages within a single conversation.

**State:**
- `messages: Message[]` — chronological message list
- `loading, error` — async status
- `typingUsers: string[]` — names of users currently typing

**Actions:**
- `sendMessage(content: string)` — sends via REST, message arrives back via WebSocket
- `sendTyping(userName: string)` — emits `chat:typing` event over WebSocket
- `refetch()` — manual re-fetch

**Realtime integration:**
- `chat:message` — appends new messages (deduplicated by `message.id`)
- `chat:typing` — updates `typingUsers` map with 3-second auto-clear timeout

---

### `ChatList`

Renders a scrollable list of conversations.

```tsx
<ChatList
  userId={userId}
  selectedChatId={activeChat?.id}
  onSelectChat={(chat) => setActiveChat(chat)}
/>
```

**Features:**
- Skeleton loading state
- Shows participant names (or group name)
- Shows truncated last message preview with sender name
- Highlights selected chat with amber background

---

### `ChatWindow`

Renders a full message thread for a selected chat.

```tsx
<ChatWindow
  chat={activeChat}
  userId={userId}
  userName={userName}
/>
```

**Features:**
- Auto-scrolls to bottom on new messages
- Distinguishes own messages (amber bubble, right-aligned) vs. others (white bubble, left-aligned)
- Shows sender name + timestamp on each message
- Displays "typing..." indicator
- Empty state: "No messages yet. Say hello! 👋"

---

### `MessageInput`

Text input with send button.

```tsx
<MessageInput
  onSend={(content) => sendMessage(content)}
  onTyping={() => sendTyping(userName)}
/>
```

**Features:**
- Disabled state while sending
- Sends on Enter (form submit)
- Triggers `onTyping` after 300ms debounce on input change

---

## Server-Side

### Routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/chat` | `listChats` | List all chats for `userId` (query param) |
| POST | `/api/chat` | `createChat` | Create a new chat (1-to-1 or group) |
| GET | `/api/chat/:id/messages` | `getMessages` | Paginated messages for a chat |
| POST | `/api/chat/:id/messages` | `sendMessage` | Send a message to a chat |

**Auth:** All endpoints expect `userId` as a query parameter. In production, this should be replaced with session middleware (Better-Auth already validates sessions before WebSocket connections).

---

### Controllers

- **`listChats`** — validates `userId`, returns chats with participants + last message
- **`createChat`** — validates `participantIds` (min 1), `name`, `isGroup` via Zod; creates chat (dedupes 1-to-1)
- **`getMessages`** — validates `userId` is a participant; supports `cursor` + `limit` pagination
- **`sendMessage`** — validates `content` (1-5000 chars); verifies participant membership; persists message; emits realtime + notification events

---

### Services

All database operations use `@repo/db` (Prisma Client + LibSQL adapter).

- **`listChats(userId)`** — `findMany` with `participants` and latest message included
- **`createChat(creatorId, participantIds, name?, isGroup?)`** — deduplicates 1-to-1; `prisma.chat.create` with participant records
- **`getMessages(chatId, cursor?, limit?)`** — reverse-chronological fetch, reversed to chronological for display
- **`sendMessage(chatId, senderId, content)`** — creates message, updates chat `updatedAt`, returns message + recipient IDs
- **`isParticipant(chatId, userId)`** — checks `ChatParticipant` composite key existence

---

### Realtime Handlers

Registered once at server startup via `registerChatRealtimeHandlers()`.

- **`chat:typing`** — client sends `{ chatId, userName }`
  - Server verifies sender is a participant
  - Broadcasts to all other participants in the chat
  - Client displays "X is typing..." with 3-second timeout

---

## Cross-Feature Integration

When a message is sent, the chat feature:

1. **Emits WebSocket** `chat:message` to all chat participants (including sender for multi-device sync)
2. **Emits internal event** `internal:notification:create` on the in-process event bus

```ts
// In sendMessage controller:
const bus = getEventBus();
for (const recipientId of recipientIds) {
  bus.emitInternal("internal:notification:create", {
    userId: recipientId,
    type: "chat_message",
    data: { chatId, messageId: message.id, senderName, content: content.substring(0, 100) },
  });
}
```

The `feature-notifications` package listens to this event and creates a notification record + WebSocket push. **No direct import** between chat and notifications packages exists.

---

## Database Schema

### `Chat`

```prisma
model Chat {
  id            String           @id @default(cuid())
  name          String?
  isGroup       Boolean          @default(false)
  participants  ChatParticipant[]
  messages      Message[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
}
```

### `ChatParticipant`

```prisma
model ChatParticipant {
  chatId   String
  userId   String
  chat     Chat   @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@id([chatId, userId])
}
```

### `Message`

```prisma
model Message {
  id        String   @id @default(cuid())
  chatId    String
  senderId  String
  content   String
  createdAt DateTime @default(now())
  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  sender    User     @relation(fields: [senderId], references: [id])
}
```

---

## API Reference

### GET `/api/chat?userId={userId}`

**Response:**
```json
[
  {
    "id": "cmxxx",
    "name": null,
    "isGroup": false,
    "participants": [
      { "userId": "user1", "user": { "id": "user1", "name": "Alice", "image": null } }
    ],
    "lastMessage": { "id": "cmxxx", "content": "Hello!", "sender": { "name": "Alice" }, "createdAt": "2025-05-05T..." },
    "createdAt": "2025-05-05T...",
    "updatedAt": "2025-05-05T..."
  }
]
```

### POST `/api/chat?userId={userId}`

**Body:**
```json
{
  "participantIds": ["user2"],
  "name": "Project Team",
  "isGroup": true
}
```

**Response:** Created `Chat` object with participants.

### GET `/api/chat/:id/messages?userId={userId}&cursor={cursor}&limit=50`

**Response:**
```json
[
  { "id": "cmxxx", "content": "Hi", "senderId": "user1", "sender": { "name": "Alice" }, "createdAt": "..." }
]
```

### POST `/api/chat/:id/messages?userId={userId}`

**Body:**
```json
{ "content": "Hello there!" }
```

**Response:** Created `Message` object.

---

## WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `chat:message` | Server → Client | `{ chatId, message }` | New message in a chat |
| `chat:typing` | Client → Server | `{ chatId, userName }` | User is typing |
| `chat:typing` | Server → Client | `{ chatId, userId, userName }` | Broadcast typing to others |

---

## Usage Example

```tsx
// apps/web/app/chat/page.tsx
"use client";
import { useState } from "react";
import { ChatList, ChatWindow, useChats } from "@repo/feature-chat/client";

export default function ChatPage({ userId, userName }: { userId: string; userName: string }) {
  const [activeChat, setActiveChat] = useState(null);
  const { chats } = useChats(userId);

  return (
    <div className="flex h-screen">
      <div className="w-80 border-r">
        <ChatList userId={userId} selectedChatId={activeChat?.id} onSelectChat={setActiveChat} />
      </div>
      <div className="flex-1">
        {activeChat ? (
          <ChatWindow chat={activeChat} userId={userId} userName={userName} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}
```

```ts
// apps/server/src/index.ts
import { chatRoutes, registerChatRealtimeHandlers } from "@repo/feature-chat/server";

app.use(chatRoutes);
// After initRealtimeServer(server):
registerChatRealtimeHandlers();
```
