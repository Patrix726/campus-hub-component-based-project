# Requirements Document

## Introduction

This document defines the requirements for the **Posts/Feed** and **Comments** features on CampusHub. The feature introduces a social feed where authenticated users can create posts, browse a feed of posts from the community, like posts, and leave comments on posts. The implementation is split across two isolated feature packages (`feature-posts` and `feature-comments`) that communicate only via HTTP APIs, following the project's strict architecture guidelines.

## Glossary

- **Post_Service**: The server-side module in `packages/feature-posts/src/server` responsible for post CRUD and like operations.
- **Comment_Service**: The server-side module in `packages/feature-comments/src/server` responsible for comment CRUD operations.
- **Feed_Client**: The client-side module in `packages/feature-posts/src/client` that renders the post feed and post creation UI.
- **Comment_Client**: The client-side module in `packages/feature-comments/src/client` that renders comment threads.
- **Event_Emitter**: A Node.js `EventEmitter` instance used to broadcast real-time events within the server process.
- **Post**: A user-generated text entry (optionally with an image URL) stored in the database.
- **Comment**: A user-generated text reply attached to a specific Post.
- **Like**: A record indicating that a User has liked a specific Post.
- **Feed**: A paginated, reverse-chronological list of Posts.
- **Authenticated_User**: A user with a valid session, identified by a `userId` extracted from the request.
- **Auth_Middleware**: An Express middleware function that validates a Better Auth session on incoming requests and rejects unauthenticated calls with HTTP 401.
- **Feed_Page**: The Next.js App Router page at `/feed` in `apps/web` that renders the post feed and post creation form.
- **Realtime_Service**: The module in `packages/realtime` that subscribes to internal event emitters and broadcasts events to connected browser clients over WebSocket or SSE.
- **Web_App**: The Next.js application in `apps/web`.

---

## Requirements

### Requirement 1: Package Structure

**User Story:** As a developer, I want each feature to live in its own isolated package with `client/`, `server/`, and `shared/` sub-directories, so that concerns are cleanly separated and the monorepo architecture is consistent.

#### Acceptance Criteria

1. THE `feature-posts` package SHALL export entry points at `.`, `./client`, `./server`, and `./shared`.
2. THE `feature-comments` package SHALL export entry points at `.`, `./client`, `./server`, and `./shared`.
3. THE `feature-posts` package SHALL NOT import from `@repo/feature-comments`.
4. THE `feature-comments` package SHALL NOT import from `@repo/feature-posts`.

---

### Requirement 2: Post Data Model

**User Story:** As a developer, I want a `Post` model in the database with a foreign key to `User`, so that posts are owned by users and can be queried relationally.

#### Acceptance Criteria

1. THE `Post_Service` SHALL define a `Post` model with fields: `id` (cuid), `content` (String), `imageUrl` (optional String), `authorId` (String FK → User), `createdAt` (DateTime), and `updatedAt` (DateTime).
2. THE `Post_Service` SHALL define a `Like` model with fields: `id` (cuid), `postId` (String FK → Post), `userId` (String FK → User), `createdAt` (DateTime), with a unique constraint on `[postId, userId]`.
3. WHEN the referenced `User` is deleted, THE database SHALL cascade-delete all `Post` records owned by that user.
4. WHEN the referenced `Post` is deleted, THE database SHALL cascade-delete all `Like` records for that post.

---

### Requirement 3: Comment Data Model

**User Story:** As a developer, I want a `Comment` model with relations to both `Post` and `User`, so that comments are correctly associated with their parent post and author.

#### Acceptance Criteria

1. THE `Comment_Service` SHALL define a `Comment` model with fields: `id` (cuid), `content` (String), `postId` (String FK → Post), `authorId` (String FK → User), `createdAt` (DateTime), and `updatedAt` (DateTime).
2. WHEN the referenced `User` is deleted, THE database SHALL cascade-delete all `Comment` records authored by that user.
3. WHEN the referenced `Post` is deleted, THE database SHALL cascade-delete all `Comment` records on that post.

---

### Requirement 4: Post CRUD API

**User Story:** As an authenticated user, I want to create, read, and delete posts, so that I can share content and manage my own posts on the feed.

#### Acceptance Criteria

1. WHEN a `POST /api/posts` request is received with a valid `content` field, THE `Post_Service` SHALL create a new `Post` record and return it with HTTP 201.
2. WHEN a `GET /api/posts` request is received, THE `Post_Service` SHALL return a paginated list of posts in reverse-chronological order, including the author's name and like count.
3. WHEN a `GET /api/posts/:postId` request is received, THE `Post_Service` SHALL return the post with the matching `postId`, including the author's name, like count, and comment count.
4. WHEN a `DELETE /api/posts/:postId` request is received from the post's author, THE `Post_Service` SHALL delete the post and return HTTP 204.
5. IF a `DELETE /api/posts/:postId` request is received from a user who is not the post's author, THEN THE `Post_Service` SHALL return HTTP 403.
6. IF a request body for `POST /api/posts` fails schema validation, THEN THE `Post_Service` SHALL return HTTP 400 with a descriptive error message.
7. IF a `GET /api/posts/:postId` request references a non-existent post, THEN THE `Post_Service` SHALL return HTTP 404.

---

### Requirement 5: Post Like API

**User Story:** As an authenticated user, I want to like and unlike posts, so that I can express appreciation for content.

#### Acceptance Criteria

1. WHEN a `POST /api/posts/:postId/like` request is received from an authenticated user who has not yet liked the post, THE `Post_Service` SHALL create a `Like` record and emit a `post:liked` event on the `Event_Emitter`.
2. WHEN a `DELETE /api/posts/:postId/like` request is received from an authenticated user who has liked the post, THE `Post_Service` SHALL delete the `Like` record.
3. IF a `POST /api/posts/:postId/like` request is received from a user who has already liked the post, THEN THE `Post_Service` SHALL return HTTP 409.
4. IF a `DELETE /api/posts/:postId/like` request is received from a user who has not liked the post, THEN THE `Post_Service` SHALL return HTTP 404.

---

### Requirement 6: Comment CRUD API

**User Story:** As an authenticated user, I want to create, read, and delete comments on posts, so that I can participate in discussions.

#### Acceptance Criteria

1. WHEN a `POST /api/posts/:postId/comments` request is received with a valid `content` field, THE `Comment_Service` SHALL create a new `Comment` record, emit a `comment:new` event on the `Event_Emitter`, and return the comment with HTTP 201.
2. WHEN a `GET /api/posts/:postId/comments` request is received, THE `Comment_Service` SHALL return all comments for the specified post in chronological order, including each author's name.
3. WHEN a `DELETE /api/posts/:postId/comments/:commentId` request is received from the comment's author, THE `Comment_Service` SHALL delete the comment and return HTTP 204.
4. IF a `DELETE /api/posts/:postId/comments/:commentId` request is received from a user who is not the comment's author, THEN THE `Comment_Service` SHALL return HTTP 403.
5. IF a request body for `POST /api/posts/:postId/comments` fails schema validation, THEN THE `Comment_Service` SHALL return HTTP 400 with a descriptive error message.

---

### Requirement 7: Real-time Event Preparation

**User Story:** As a developer, I want standardised event emitters exported from each feature package, so that a future WebSocket or SSE layer can subscribe to `post:liked` and `comment:new` events without modifying feature internals.

#### Acceptance Criteria

1. THE `Post_Service` SHALL export a named `postEvents` instance of Node.js `EventEmitter`.
2. THE `Comment_Service` SHALL export a named `commentEvents` instance of Node.js `EventEmitter`.
3. WHEN a post is liked, THE `Post_Service` SHALL emit a `post:liked` event on `postEvents` with a payload of `{ postId: string, userId: string }`.
4. WHEN a comment is created, THE `Comment_Service` SHALL emit a `comment:new` event on `commentEvents` with a payload of `{ commentId: string, postId: string, authorId: string }`.

---

### Requirement 8: Route Integration

**User Story:** As a developer, I want the post and comment routes exported as named Express Routers, so that they can be mounted in `apps/server/src/index.ts` without modifying the feature packages.

#### Acceptance Criteria

1. THE `Post_Service` SHALL export a named `postRoutes` constant of type `Router`.
2. THE `Comment_Service` SHALL export a named `commentRoutes` constant of type `Router`.
3. WHEN `postRoutes` and `commentRoutes` are mounted in `apps/server/src/index.ts`, THE Server SHALL handle all post and comment API endpoints without route conflicts.

---

### Requirement 9: Shared Types and Validation

**User Story:** As a developer, I want shared TypeScript types and Zod schemas exported from each feature's `shared/` entry point, so that client and server code share a single source of truth for data shapes.

#### Acceptance Criteria

1. THE `feature-posts` shared module SHALL export TypeScript types `Post`, `Like`, `CreatePostInput`, and `FeedPost`.
2. THE `feature-comments` shared module SHALL export TypeScript types `Comment` and `CreateCommentInput`.
3. THE `feature-posts` shared module SHALL export Zod schemas `createPostSchema` and `feedQuerySchema`.
4. THE `feature-comments` shared module SHALL export a Zod schema `createCommentSchema`.

---

### Requirement 10: Client Hooks

**User Story:** As a front-end developer, I want React hooks for fetching and mutating posts and comments, so that UI components can interact with the API without duplicating fetch logic.

#### Acceptance Criteria

1. THE `Feed_Client` SHALL export a `useFeed` hook that fetches the paginated post feed and exposes `posts`, `loading`, `error`, and a `refresh` function.
2. THE `Feed_Client` SHALL export a `usePost` hook that fetches a single post by `postId` and exposes `post`, `loading`, and `error`.
3. THE `Comment_Client` SHALL export a `useComments` hook that fetches comments for a given `postId` and exposes `comments`, `loading`, `error`, and a `refresh` function.

---

### Requirement 11: Authentication Middleware

**User Story:** As a security-conscious developer, I want all mutating routes for posts and comments protected by the Better Auth session middleware, so that only authenticated users with valid sessions can create, like, or delete content.

#### Acceptance Criteria

1. THE `Auth_Middleware` SHALL be applied to all `POST` and `DELETE` routes in `postRoutes` and `commentRoutes` before any route handler executes.
2. WHEN a request arrives at a mutating route with a valid Better Auth session cookie, THE `Auth_Middleware` SHALL extract the `userId` from the session and make it available to the route handler.
3. IF a request arrives at a mutating route without a valid Better Auth session, THEN THE `Auth_Middleware` SHALL return HTTP 401 before the route handler is invoked.
4. THE `Auth_Middleware` SHALL use `@repo/auth`'s `auth.api.getSession` (or equivalent Better Auth Node.js helper) to validate the session from the incoming request headers.
5. THE `GET` routes for posts and comments SHALL remain publicly accessible and SHALL NOT require a valid session.
6. THE `Auth_Middleware` SHALL replace the existing `getUserId()` helper that reads the `x-user-id` header directly.

---

### Requirement 12: Global Feed Page

**User Story:** As an authenticated user, I want a `/feed` page in the web application where I can browse the community post feed and create new posts, so that I can participate in the social experience without leaving the app.

#### Acceptance Criteria

1. THE `Web_App` SHALL expose a `/feed` route rendered by a Next.js App Router page at `apps/web/src/app/feed/page.tsx`.
2. WHEN the `/feed` page is loaded by an authenticated user, THE `Feed_Page` SHALL render the list of posts using the `useFeed` hook from `@repo/feature-posts/client`.
3. THE `Feed_Page` SHALL display a post creation form that accepts a `content` text input and an optional `imageUrl` input, using `Button` and `Input` components from `@repo/ui`.
4. WHEN a user submits the post creation form with valid content, THE `Feed_Page` SHALL call `POST /api/posts` and refresh the feed on success.
5. IF the post creation form is submitted with empty content, THEN THE `Feed_Page` SHALL display a validation error message without submitting the request.
6. WHEN the `/feed` page is accessed by an unauthenticated user, THE `Web_App` SHALL redirect the user to `/login`.
7. THE `Feed_Page` SHALL display a loading indicator while the feed is being fetched.
8. IF the feed fetch fails, THEN THE `Feed_Page` SHALL display a human-readable error message.

---

### Requirement 13: Realtime Package

**User Story:** As a developer, I want a dedicated `packages/realtime` package that bridges the internal `postEvents` and `commentEvents` emitters to connected browser clients over WebSocket or SSE, so that the UI can receive live updates without polling.

#### Acceptance Criteria

1. THE `Realtime_Service` SHALL be implemented as a new package at `packages/realtime` with its own `package.json` and TypeScript configuration.
2. THE `Realtime_Service` SHALL subscribe to the `post:liked` event on `postEvents` (imported from `@repo/feature-posts/server`) and broadcast the event payload to all connected clients.
3. THE `Realtime_Service` SHALL subscribe to the `comment:new` event on `commentEvents` (imported from `@repo/feature-comments/server`) and broadcast the event payload to all connected clients.
4. THE `Realtime_Service` SHALL expose an `attachRealtime(server: http.Server): void` function that registers the WebSocket or SSE upgrade handler on the provided HTTP server instance.
5. WHEN a client connects to the realtime endpoint, THE `Realtime_Service` SHALL add the client to the active connection pool.
6. WHEN a client disconnects, THE `Realtime_Service` SHALL remove the client from the active connection pool.
7. THE `Realtime_Service` SHALL NOT import from `@repo/feature-comments` in `@repo/feature-posts`, and SHALL NOT import from `@repo/feature-posts` in `@repo/feature-comments`, preserving the no-circular-dependency constraint.
8. THE `Realtime_Service` SHALL broadcast events as JSON-serialised messages with a `type` field (`"post:liked"` or `"comment:new"`) and a `payload` field containing the original event data.
