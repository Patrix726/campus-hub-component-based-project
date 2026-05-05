# Campus Hub — Component-Based Project

A fullstack monorepo built with **Turborepo**, **Next.js**, **Express**, **Prisma**, **SQLite/Turso**, **Better-Auth**, and **WebSocket** real-time messaging. Designed as a **feature-package architecture** where each domain lives in its own independent package with clear client/server/shared boundaries.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Apps](#apps)
- [Packages](#packages)
  - [feature-auth](#feature-auth)
  - [feature-user-profiles](#feature-user-profiles)
  - [feature-chat](#feature-chat)
  - [feature-notifications](#feature-notifications)
  - [realtime](#realtime)
  - [auth, db, env, types, utils, ui](#shared-infrastructure)
- [Feature-to-Feature Communication](#feature-to-feature-communication)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Scripts](#scripts)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MONOREPO (Turborepo)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  apps/web  (Next.js 16)                                                     │
│  ├── SSR pages, client pages, shared layout                                 │
│  ├── Uses @repo/feature-*/client components                                 │
│  ├── Uses @repo/realtime/client for WebSocket                               │
│  └── Proxies auth, profile, chat, notification API calls                    │
│                                                                             │
│  apps/server  (Express 5)                                                   │
│  ├── Mounts feature server routes (@repo/feature-*/server)                  │
│  ├── Mounts Better-Auth handler (@repo/auth)                                │
│  ├── Initializes WebSocket server (@repo/realtime/server)                   │
│  └── Registers cross-feature event listeners                                │
│                                                                             │
│  packages/feature-*                                                         │
│  ├─ client/   React hooks & UI components                                   │
│  ├─ server/   Express routers, controllers, services, realtime handlers     │
│  ├─ shared/   Types, Zod schemas, constants                                 │
│  └─ package.json exports: . /client /server /shared                         │
│                                                                             │
│  packages/realtime                                                          │
│  ├─ server/   WebSocketServer singleton + internal EventBus                 │
│  └─ client/   React Context + useRealtimeEvent hook                         │
│                                                                             │
│  packages/auth     Better-Auth configuration (Prisma adapter)               │
│  packages/db       Prisma Client + SQLite/LibSQL adapter                    │
│  packages/env      T3-env validated env vars (server + web)                 │
│  packages/types    Shared API response / pagination types                   │
│  packages/utils    Date, string, array, validation helpers                  │
│  packages/ui       shadcn/ui primitives (Button, Card, Input, etc.)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Feature packages** (`feature-chat`, `feature-notifications`, `feature-auth`, `feature-user-profiles`) | Each domain is self-contained with client, server, and shared exports. Prevents circular imports and enables independent development. |
| **Realtime layer** (`@repo/realtime`) | Single WebSocket server shared by all features. Features emit events via namespacing (`chat:message`, `notification:new`). |
| **Event bus decoupling** (`@repo/realtime/server#getEventBus`) | Server-side features communicate via an in-process `EventEmitter` without importing each other. Chat emits `internal:notification:create`; Notifications listens. |
| **Better-Auth + Prisma** | Type-safe, cookie-based auth with email/password. Session validated by auth middleware before WebSocket connection. |
| **SQLite via Turso/LibSQL** | Zero-config local DB for development; same Prisma schema works for Turso in production. |

---

## Project Structure

```
campus-hub-component-based-project/
├── apps/
│   ├── web/                    # Next.js frontend (port 3001)
│   │   ├── src/app/            # Pages: /, /login, /dashboard, /profile, /edit-profile
│   │   ├── src/components/     # App-specific wrappers around feature packages
│   │   └── src/lib/auth-client.ts
│   └── server/                 # Express API (port 3000)
│       └── src/index.ts        # Mounts auth, profile routes; starts HTTP + WS server
│
├── packages/
│   ├── feature-auth/           # Auth forms, hooks, shared types, server route wrapper
│   ├── feature-user-profiles/  # Profile CRUD (bio, major, year, avatar)
│   ├── feature-chat/           # Chat & messaging. See packages/feature-chat/README.md
│   ├── feature-notifications/  # Notification system. See packages/feature-notifications/README.md
│   ├── realtime/               # Shared WebSocket server & client. See packages/realtime/README.md
│   ├── auth/                   # Better-Auth instance configuration
│   ├── db/                     # Prisma schema + generated client + adapter
│   ├── env/                    # Validated environment variables
│   ├── types/                  # Common API/pagination types
│   ├── utils/                  # Helper functions
│   └── ui/                     # Shared shadcn/ui components & Tailwind styles
│
├── turbo.json                  # Turborepo pipeline (build, dev, check-types, db:*)
├── pnpm-workspace.yaml         # Workspace catalog dependencies
└── package.json                # Root scripts & workspace dependencies
```

---

## Apps

### `apps/web` — Next.js Frontend

- **Framework:** Next.js 16 with App Router
- **Styling:** TailwindCSS 4 + shadcn/ui primitives from `@repo/ui`
- **Auth client:** `better-auth/react` via `@/lib/auth-client.ts`
- **Pages:**
  - `/` — Landing page
  - `/login` — Toggle between Sign In & Sign Up forms (uses `SignInForm`, `SignUpForm`)
  - `/dashboard` — Protected dashboard
  - `/profile` — SSR profile page (reads session server-side, redirects if unauthenticated)
  - `/edit-profile` — Client profile editing form
- **Features used:**
  - `@repo/feature-auth/client` — `LoginForm`, `SignupForm`, `LogoutButton`, `useAuth`
  - `@repo/feature-user-profiles/client` — `ProfilePage`, `EditProfileForm`, `useProfile`
  - `@repo/feature-chat/client` — `ChatList`, `ChatWindow`, `useChats`, `useMessages`
  - `@repo/feature-notifications/client` — `NotificationBell`, `useNotifications`
  - `@repo/realtime/client` — `RealtimeProvider`, `useRealtimeEvent`

### `apps/server` — Express Backend

- **Entry:** `src/index.ts`
- **Middleware:** CORS, JSON body parsing
- **Routes mounted:**
  - `POST|GET /api/auth/*` — Better-Auth node handler (`@repo/auth`)
  - `GET|PUT /api/profiles/:userId` — Profile CRUD (`@repo/feature-user-profiles/server`)
  - `GET|POST /api/chat/*` — Chat routes (`@repo/feature-chat/server`)
  - `GET|PATCH /api/notifications/*` — Notification routes (`@repo/feature-notifications/server`)
- **WebSocket:** Initialized on the same HTTP server (`initRealtimeServer(server)`)
- **Startup sequence:**
  1. Create Express app
  2. Mount auth handler + feature routes
  3. Start HTTP server on port 3000
  4. Initialize `RealtimeServer` on the HTTP server
  5. Register `registerChatRealtimeHandlers()`
  6. Register `registerNotificationListeners()` on the internal event bus

---

## Packages

### `packages/feature-auth`

**Purpose:** Authentication UI and shared auth types.

| Export | Path | Description |
|--------|------|-------------|
| `LoginForm` | `./client` | Email/password sign-in form with `useAuth` |
| `SignupForm` | `./client` | Email/password sign-up form with `useAuth` |
| `LogoutButton` | `./client` | Conditionally renders if user is authenticated |
| `useAuth` | `./client` | Hook wrapping `better-auth/react` session + signIn/signUp/signOut |
| `authClient` | `./client` | Pre-configured `createAuthClient` instance |
| `authRoutes` | `./server` | Express route mapping for Better-Auth node handler |
| `User`, `AuthSession` | `./shared` | Shared TypeScript types |

### `packages/feature-user-profiles`

**Purpose:** User profile extension beyond auth (bio, major, year, avatar).

| Export | Path | Description |
|--------|------|-------------|
| `ProfilePage` | `./client` | Displays user info + profile fields with skeleton loading |
| `EditProfileForm` | `./client` | Form to update bio, major, year, avatar URL |
| `AvatarUpload` | `./client` | File input wrapper (mock upload via object URL) |
| `useProfile` | `./client` | Hook: `fetchProfile` + `updateProfile` via REST |
| `profileRoutes` | `./server` | Express router: `GET /api/profiles/:userId`, `PUT /api/profiles/:userId` |
| `Profile`, `UpdateProfileInput` | `./shared` | Types + Zod schema for validation |

**Server implementation:**
- Uses `prisma.profile.upsert` — creates profile on first edit if it doesn't exist
- Zod validation on `PUT` for `bio`, `major`, `year`, `avatar`

---

### `packages/feature-chat`

**Purpose:** Real-time chat and messaging between users.

**See [packages/feature-chat/README.md](packages/feature-chat/README.md) for full documentation.**

Quick summary:
- **Client:** `ChatList`, `ChatWindow`, `MessageInput`, `useChats`, `useMessages`
- **Server:** `GET /api/chat`, `POST /api/chat`, `GET /api/chat/:id/messages`, `POST /api/chat/:id/messages`
- **Realtime:** `chat:message`, `chat:typing` events via `@repo/realtime`
- **Cross-feature:** Emits `internal:notification:create` on the event bus when a message is sent

---

### `packages/feature-notifications`

**Purpose:** Push notification system with real-time delivery.

**See [packages/feature-notifications/README.md](packages/feature-notifications/README.md) for full documentation.**

Quick summary:
- **Client:** `NotificationBell`, `NotificationDropdown`, `UnreadBadge`, `useNotifications`
- **Server:** `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- **Realtime:** `notification:new` events via `@repo/realtime`
- **Cross-feature:** Listens on `internal:notification:create` event bus events from chat (and future features)

---

### `packages/realtime`

**Purpose:** Single shared WebSocket infrastructure for the entire app.

**See [packages/realtime/README.md](packages/realtime/README.md) for full documentation.**

Quick summary:
- **Server:** `RealtimeServer` wraps `ws.WebSocketServer` on `/ws`; user-scoped broadcasting via `emitToUsers`/`emitToUser`; server-side listeners via `on()`; event bus via `getEventBus()` for in-process cross-feature communication
- **Client:** `RealtimeProvider` React Context with auto-reconnect; `useRealtime()` and `useRealtimeEvent()` hooks for subscribing and sending events
- **Event namespacing:** `<feature>:<action>` (e.g. `chat:message`, `notification:new`)

---

### Shared Infrastructure

| Package | Role |
|---------|------|
| `packages/auth` | Better-Auth instance with Prisma adapter, email/password, secure cookies |
| `packages/db` | Prisma Client + `@prisma/adapter-libsql` for SQLite/Turso. Schema split across `schema/auth.prisma` and `schema/profiles.prisma` |
| `packages/env` | T3-env validated env: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_SERVER_URL` |
| `packages/types` | `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError` |
| `packages/utils` | `formatDate`, `formatDateTime`, `capitalize`, `truncate`, `unique`, `groupBy`, `isEmail`, `isUrl` |
| `packages/ui` | shadcn/ui primitives: `Button`, `Card`, `Input`, `Label`, `Checkbox`, `DropdownMenu`, `Skeleton`, `Sonner` |

---

## Feature-to-Feature Communication

The **event bus** in `@repo/realtime/server` enables loose coupling between features.

```
┌──────────────┐      internal:notification:create       ┌─────────────────────┐
│ feature-chat │ ──────────────────────────────────────> │ feature-notifications│
│  (emits)     │         (in-process EventEmitter)       │  (listens)           │
└──────────────┘                                         └─────────────────────┘
                              via getEventBus()
```

**Why this matters:** `feature-chat` never imports `feature-notifications`. It simply emits a typed event. Notifications registers a listener at server startup. This pattern scales to any number of features (e.g., a future `feature-events` package could also emit notifications without adding imports).

---

## Database Schema

**SQLite** via Prisma with LibSQL adapter.

### Auth models (`schema/auth.prisma`)
- `User` — id, name, email, emailVerified, image, sessions[], accounts[], profile?
- `Session` — id, token, expiresAt, userId, ipAddress, userAgent
- `Account` — OAuth/password account linking
- `Verification` — email verification tokens

### Profile model (`schema/profiles.prisma`)
- `Profile` — id (cuid), userId (unique), bio?, major?, year?, avatar?, createdAt, updatedAt
- One-to-one relation with `User`

### Chat models (used by `feature-chat`)
- `Chat` — id, name?, isGroup, participants[], messages[], createdAt, updatedAt
- `ChatParticipant` — chatId + userId composite key
- `Message` — id, chatId, senderId, content, createdAt

### Notification model (used by `feature-notifications`)
- `Notification` — id, userId, type, data (JSON string), read (boolean), createdAt

---

## Getting Started

### Prerequisites

- Node.js + pnpm (package manager defined in `packageManager`)
- SQLite (local) or Turso account (production)

### Install dependencies

```bash
pnpm install
```

### Database setup

```bash
# Start local SQLite database (optional)
pnpm run db:local

# Push schema and generate Prisma client
pnpm run db:push
```

### Environment variables

Create `.env` files in `apps/server/` and `apps/web/`:

```bash
# apps/server/.env
DATABASE_URL="file:./local.db"
BETTER_AUTH_SECRET="your-32-char-secret-here"
BETTER_AUTH_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3001"
NODE_ENV="development"

# apps/web/.env
NEXT_PUBLIC_SERVER_URL="http://localhost:3000"
```

### Run development

```bash
# Start both web and server
pnpm run dev

# Or individually
pnpm run dev:web     # Next.js on http://localhost:3001
pnpm run dev:server  # Express on http://localhost:3000
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start all apps in development (Turborepo) |
| `pnpm run build` | Build all apps and packages |
| `pnpm run check-types` | TypeScript type checking across all packages |
| `pnpm run dev:web` | Start only Next.js frontend |
| `pnpm run dev:server` | Start only Express backend |
| `pnpm run db:push` | Push Prisma schema to database |
| `pnpm run db:generate` | Generate Prisma Client |
| `pnpm run db:migrate` | Run Prisma migrations |
| `pnpm run db:studio` | Open Prisma Studio UI |
| `pnpm run db:local` | Start local SQLite (Turso dev) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS 4, shadcn/ui |
| Backend | Express 5, TypeScript |
| Database | SQLite (LibSQL/Turso), Prisma ORM |
| Auth | Better-Auth (email/password, cookie-based) |
| Realtime | WebSocket (`ws` library) |
| Monorepo | Turborepo, pnpm workspaces |
| Validation | Zod |
| Forms | TanStack Form |

---

## License

MIT
