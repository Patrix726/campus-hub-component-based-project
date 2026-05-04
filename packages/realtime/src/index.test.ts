// Feature: posts-and-comments, Property 11: For any event type ("post:liked" or "comment:new")
// and any payload object, when the event is emitted on the corresponding EventEmitter, all
// connected WebSocket clients SHALL receive a JSON message with { type: <event-type>,
// payload: <original-payload> }.

/**
 * Validates: Requirements 13.2, 13.3, 13.8
 *
 * Strategy:
 * - Mock `ws` to provide a fake WebSocketServer whose `connection` event we can trigger
 *   manually, and whose clients we control.
 * - Mock `@repo/feature-posts/server` and `@repo/feature-comments/server` to expose
 *   real EventEmitter instances that we own, so we can emit events directly.
 * - Call `attachRealtime` with a mock http.Server — the function subscribes to the
 *   EventEmitters and registers a `connection` handler on the fake WSS.
 * - For each generated (eventType, payload, clientCount) triple:
 *     1. Simulate N WebSocket clients connecting by emitting `connection` on the fake WSS.
 *     2. Emit the event on the appropriate EventEmitter.
 *     3. Verify every mock client received exactly one `send` call with the correct JSON.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";

// ── Use vi.hoisted so these values are available inside vi.mock factories ─────
// vi.mock calls are hoisted to the top of the file by Vitest's transformer,
// so any variables they reference must also be hoisted.

const { fakePostEvents, fakeCommentEvents, getFakeWssInstance, FakeWebSocketServer, FakeWebSocket } =
  vi.hoisted(() => {
    const { EventEmitter } = require("node:events") as typeof import("node:events");

    const fakePostEvents = new EventEmitter();
    const fakeCommentEvents = new EventEmitter();

    // The fake WSS instance is stored here so tests can access it after attachRealtime runs.
    let _fakeWssInstance: InstanceType<typeof FakeWebSocketServer> | null = null;

    class FakeWebSocketServer extends EventEmitter {
      constructor(_opts: unknown) {
        super();
        _fakeWssInstance = this;
      }
    }

    // Fake WebSocket class with the OPEN constant that broadcast checks
    class FakeWebSocket {
      static OPEN = 1;
    }

    function getFakeWssInstance() {
      return _fakeWssInstance!;
    }

    return { fakePostEvents, fakeCommentEvents, getFakeWssInstance, FakeWebSocketServer, FakeWebSocket };
  });

// ── Mock @repo/feature-posts/server ──────────────────────────────────────────
vi.mock("@repo/feature-posts/server", () => ({
  postEvents: fakePostEvents,
  postRoutes: {},
}));

// ── Mock @repo/feature-comments/server ───────────────────────────────────────
vi.mock("@repo/feature-comments/server", () => ({
  commentEvents: fakeCommentEvents,
  commentRoutes: {},
}));

// ── Mock `ws` module ──────────────────────────────────────────────────────────
vi.mock("ws", () => ({
  WebSocketServer: FakeWebSocketServer,
  WebSocket: FakeWebSocket,
}));

// ── Import the module under test AFTER mocks are set up ───────────────────────
import { attachRealtime } from "./index";

// ── Helper: create a fresh mock WebSocket client ──────────────────────────────
function makeFakeClient() {
  return {
    readyState: 1, // OPEN
    send: vi.fn(),
    on: vi.fn(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Property 11: Realtime broadcast delivers correct message structure", () => {
  beforeEach(() => {
    // Remove all listeners from the fake EventEmitters between tests so
    // attachRealtime subscriptions from previous iterations don't accumulate.
    fakePostEvents.removeAllListeners();
    fakeCommentEvents.removeAllListeners();

    // Call attachRealtime once per test to register fresh subscriptions.
    // The mock http.Server is just a plain object — attachRealtime only passes
    // it to the WebSocketServer constructor, which we've mocked away.
    const mockServer = {} as Server;
    attachRealtime(mockServer);
  });

  it(
    "all connected clients receive { type, payload } JSON for any event type and payload",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate one of the two supported event types
          fc.constantFrom("post:liked" as const, "comment:new" as const),
          // Generate an arbitrary JSON-serialisable payload object
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.oneof(
              fc.string({ maxLength: 50 }),
              fc.integer(),
              fc.boolean(),
              fc.constant(null)
            )
          ),
          // Generate between 1 and 5 mock clients to keep tests fast
          fc.integer({ min: 1, max: 5 }),
          async (eventType, payload, clientCount) => {
            const fakeWss = getFakeWssInstance();

            // 1. Create N mock WebSocket clients and simulate them connecting
            const mockClients = Array.from({ length: clientCount }, makeFakeClient);

            for (const client of mockClients) {
              // Trigger the `connection` handler that attachRealtime registered
              fakeWss.emit("connection", client);
            }

            // 2. Emit the event on the appropriate EventEmitter
            if (eventType === "post:liked") {
              fakePostEvents.emit("post:liked", payload);
            } else {
              fakeCommentEvents.emit("comment:new", payload);
            }

            // 3. Verify every client received exactly one send call with the correct JSON
            const expectedMessage = JSON.stringify({ type: eventType, payload });

            for (const client of mockClients) {
              expect(client.send).toHaveBeenCalledTimes(1);
              expect(client.send).toHaveBeenCalledWith(expectedMessage);
            }

            // Clean up: reset send mocks and remove clients from the pool for the
            // next iteration by triggering the close handler attachRealtime registered.
            for (const client of mockClients) {
              client.send.mockReset();
              const closeCall = client.on.mock.calls.find(
                ([event]: [string]) => event === "close"
              );
              if (closeCall) {
                const closeHandler = closeCall[1] as () => void;
                closeHandler();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// Feature: posts-and-comments, Property 12: For any number of WebSocket clients N that connect
// and then M that disconnect (M ≤ N), the active connection pool SHALL contain exactly N − M clients.

/**
 * Validates: Requirements 13.5, 13.6
 *
 * Strategy:
 * - Reuse the same mock infrastructure (FakeWebSocketServer, makeFakeClient, etc.) from Property 11.
 * - Call `attachRealtime` in a fresh beforeEach so the pool starts empty.
 * - For each generated (N, M) pair where 1 ≤ N ≤ 20 and 0 ≤ M ≤ N:
 *     1. Connect N mock clients by emitting `connection` on the fake WSS.
 *     2. Disconnect M of those clients by invoking the `close` handler that
 *        `attachRealtime` registered on each client via `ws.on("close", ...)`.
 *     3. Emit a broadcast event (post:liked with an empty payload).
 *     4. Count how many clients received a `send` call — this equals the pool size.
 *     5. Assert the count equals N − M.
 */

describe("Property 12: Connection pool tracks clients accurately", () => {
  beforeEach(() => {
    // Reset EventEmitter listeners so subscriptions don't accumulate across iterations.
    fakePostEvents.removeAllListeners();
    fakeCommentEvents.removeAllListeners();

    // Fresh attachRealtime call so the internal `clients` Set starts empty.
    const mockServer = {} as Server;
    attachRealtime(mockServer);
  });

  it(
    "pool contains exactly N − M clients after N connect and M disconnect",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // N: number of clients that connect (1–20)
          fc.integer({ min: 1, max: 20 }),
          // M: number of those clients that then disconnect (0–N)
          fc.integer({ min: 0, max: 20 }),
          async (n, m) => {
            // Ensure M ≤ N
            const N = n;
            const M = Math.min(m, N);

            const fakeWss = getFakeWssInstance();

            // 1. Connect N mock clients
            const mockClients = Array.from({ length: N }, makeFakeClient);
            for (const client of mockClients) {
              fakeWss.emit("connection", client);
            }

            // 2. Disconnect the first M clients by invoking their registered close handler
            for (let i = 0; i < M; i++) {
              const client = mockClients[i];
              const closeCall = client.on.mock.calls.find(
                ([event]: [string]) => event === "close"
              );
              if (closeCall) {
                const closeHandler = closeCall[1] as () => void;
                closeHandler();
              }
            }

            // 3. Emit a broadcast event to probe the pool
            fakePostEvents.emit("post:liked", {});

            // 4. Count how many clients received a send call — equals pool size
            const receivedCount = mockClients.filter(
              (client) => client.send.mock.calls.length > 0
            ).length;

            // 5. Assert pool size equals N − M
            expect(receivedCount).toBe(N - M);

            // Clean up: remove remaining clients from the pool for the next iteration
            for (let i = M; i < N; i++) {
              const client = mockClients[i];
              client.send.mockReset();
              const closeCall = client.on.mock.calls.find(
                ([event]: [string]) => event === "close"
              );
              if (closeCall) {
                const closeHandler = closeCall[1] as () => void;
                closeHandler();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
