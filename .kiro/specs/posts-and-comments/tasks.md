# Tasks: Posts and Comments

## Task List

- [x] 1. Add auth middleware to the Express server
  - [x] 1.1 Create `apps/server/src/middleware/auth.ts` exporting a `requireAuth: RequestHandler` that calls `auth.api.getSession` via `fromNodeHeaders(req.headers)`, sets `res.locals.userId`, and returns 401 if no valid session is found
  - [x] 1.2 Update `apps/server/src/index.ts` to import `requireAuth` and apply it to all mutating routes (`POST /api/posts`, `DELETE /api/posts/:postId`, `POST /api/posts/:postId/like`, `DELETE /api/posts/:postId/like`, `POST /api/posts/:postId/comments`, `DELETE /api/posts/:postId/comments/:commentId`) before the feature routers handle them
  - [x] 1.3 Update `packages/feature-posts/src/server/index.ts` to replace the `getUserId()` helper with `res.locals.userId` in all route handlers
  - [x] 1.4 Update `packages/feature-comments/src/server/index.ts` to replace the `getUserId()` helper with `res.locals.userId` in all route handlers
  - [x] 1.5 Add `better-auth` to `apps/server/package.json` dependencies if not already present (needed for `fromNodeHeaders` import)

- [x] 2. Create the `packages/realtime` package
  - [x] 2.1 Create `packages/realtime/package.json` with name `@repo/realtime`, type `module`, main entry `./src/index.ts`, and dependencies on `@repo/feature-posts`, `@repo/feature-comments`, and `ws`
  - [x] 2.2 Create `packages/realtime/tsconfig.json` extending `@repo/config/tsconfig.base.json`
  - [x] 2.3 Create `packages/realtime/src/index.ts` exporting `attachRealtime(server: http.Server): void` that creates a `WebSocketServer` on path `/ws`, maintains a `Set<WebSocket>` connection pool, subscribes to `postEvents` (`post:liked`) and `commentEvents` (`comment:new`), and broadcasts `{ type, payload }` JSON messages to all open clients
  - [x] 2.4 Update `apps/server/src/index.ts` to import `attachRealtime` from `@repo/realtime`, convert the `app.listen` call to capture the `http.Server` instance, and call `attachRealtime(server)` after the server starts
  - [x] 2.5 Add `@repo/realtime` as a workspace dependency in `apps/server/package.json`
  - [x] 2.6 Add `@types/ws` to `packages/realtime` devDependencies

- [x] 3. Create the Global Feed page in `apps/web`
  - [x] 3.1 Add `@repo/feature-posts` and `@repo/feature-comments` as workspace dependencies in `apps/web/package.json`
  - [x] 3.2 Create `apps/web/src/app/feed/page.tsx` as a Next.js server component that checks the session via `authClient.getSession`, redirects to `/login` if unauthenticated, and renders `<FeedClient session={session} />`
  - [x] 3.3 Create `apps/web/src/app/feed/feed-client.tsx` as a `"use client"` component that uses `useFeed` from `@repo/feature-posts/client` to render the post list, shows a loading indicator while `loading === true`, shows a human-readable error message when `error !== null`, and renders a post creation form with a `content` Textarea and optional `imageUrl` Input using `@repo/ui` components
  - [x] 3.4 Implement form submission in `feed-client.tsx`: validate that `content` is non-empty (show inline error if not), call `POST /api/posts` with the form data, and call `refresh()` on success

- [x] 4. Write property-based tests for Zod schemas
  - [x] 4.1 Set up Vitest and fast-check in `packages/feature-posts` (add to devDependencies, create `vitest.config.ts` if not present)
  - [x] 4.2 Create `packages/feature-posts/src/shared/index.test.ts` with property tests for `createPostSchema`: Property 1 (accepts all valid inputs — non-empty strings ≤2000 chars, optional valid URLs) and Property 2 (rejects all invalid inputs — empty strings, strings >2000 chars, invalid URLs)
  - [x] 4.3 Set up Vitest and fast-check in `packages/feature-comments` (add to devDependencies, create `vitest.config.ts` if not present)
  - [x] 4.4 Create `packages/feature-comments/src/shared/index.test.ts` with property tests for `createCommentSchema`: Property 3 (accepts all valid inputs — non-empty strings ≤1000 chars) and Property 4 (rejects all invalid inputs — empty strings, strings >1000 chars)

- [x] 5. Write property-based tests for feed ordering and pagination
  - [x] 5.1 Create `packages/feature-posts/src/server/feed.test.ts` with a property test for Property 5 (feed is always in reverse-chronological order): generate N posts with random timestamps, sort them as the server would, verify `posts[i].createdAt >= posts[i+1].createdAt` for all consecutive pairs
  - [x] 5.2 Add a property test for Property 6 (pagination returns the correct slice): generate N posts, random page P and limit L, verify the slice `(P-1)*L` to `P*L` matches the paginated response

- [x] 6. Write property-based tests for event emission
  - [x] 6.1 Create `packages/feature-posts/src/server/events.test.ts` with a property test for Property 8 (like creation emits correct event payload): generate random `postId`/`userId` pairs, mock Prisma, call the like handler, capture the `post:liked` event, verify payload equals `{ postId, userId }`
  - [x] 6.2 Create `packages/feature-comments/src/server/events.test.ts` with a property test for Property 9 (comment creation emits correct event payload): generate random comment inputs and `postId`, mock Prisma, call the comment handler, capture the `comment:new` event, verify payload equals `{ commentId, postId, authorId }`
  - [x] 6.3 Create `packages/feature-comments/src/server/ordering.test.ts` with a property test for Property 10 (comments are always in chronological order): generate N comments with random timestamps, sort as the server would, verify `comments[i].createdAt <= comments[i+1].createdAt`

- [x] 7. Write property-based tests for the realtime package
  - [x] 7.1 Set up Vitest and fast-check in `packages/realtime` (add to devDependencies, create `vitest.config.ts`)
  - [x] 7.2 Create `packages/realtime/src/index.test.ts` with a property test for Property 11 (broadcast delivers correct message structure): generate random payloads for both event types, emit on the EventEmitter, verify all mock WebSocket clients receive `{ type, payload }` JSON
  - [x] 7.3 Add a property test for Property 12 (connection pool tracks clients accurately): connect N mock clients, disconnect M of them, verify pool size equals N − M
