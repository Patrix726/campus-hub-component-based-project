// Feature: posts-and-comments, Property 8: For any postId and userId, when a like is created
// via POST /api/posts/:postId/like, the post:liked event emitted on postEvents SHALL have a
// payload of exactly { postId, userId }.

/**
 * Validates: Requirements 5.1, 7.3
 *
 * Strategy:
 * - Mock @repo/db so no real database is needed.
 * - Import postEvents from the server module (the same EventEmitter instance used by the handler).
 * - Extract the POST /api/posts/:postId/like route handler from the Express router by
 *   inspecting router.stack.
 * - For each generated (postId, userId) pair:
 *     1. Set up a one-time listener on postEvents for "post:liked".
 *     2. Build mock req/res objects with the correct params and locals.
 *     3. Invoke the handler.
 *     4. Verify the captured payload equals { postId, userId }.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import type { Request, Response, NextFunction } from "express";

// ── Mock @repo/db before importing the server module ─────────────────────────
// Use vi.hoisted so the mock variables are available when vi.mock factory runs
// (vi.mock calls are hoisted to the top of the file by Vitest's transformer).

const { mockLikeFindUnique, mockLikeCreate } = vi.hoisted(() => ({
  mockLikeFindUnique: vi.fn(),
  mockLikeCreate: vi.fn(),
}));

vi.mock("@repo/db", () => ({
  createPrismaClient: () => ({
    like: {
      findUnique: mockLikeFindUnique,
      create: mockLikeCreate,
    },
    post: {},
  }),
}));

// Import after mocking so the module picks up the mock
import { postEvents, postRoutes } from "./index";

// ── Helper: extract the like route handler from the Express router ────────────

/**
 * Walks the router's internal stack to find the handler registered for
 * POST /api/posts/:postId/like and returns it.
 */
function getLikeHandler(): (req: Request, res: Response, next: NextFunction) => void {
  // Express Router stores layers in router.stack; each layer has a route property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack = (postRoutes as any).stack as any[];
  for (const layer of stack) {
    if (
      layer.route &&
      layer.route.path === "/api/posts/:postId/like" &&
      layer.route.methods?.post
    ) {
      // The route's stack contains the actual handler(s)
      const routeStack = layer.route.stack as any[];
      const handlerLayer = routeStack[routeStack.length - 1];
      return handlerLayer.handle;
    }
  }
  throw new Error("Could not find POST /api/posts/:postId/like handler in router stack");
}

// ── Helper: build minimal mock req/res objects ────────────────────────────────

function makeMockReqRes(postId: string, userId: string) {
  const req = {
    params: { postId },
    body: {},
    query: {},
  } as unknown as Request;

  const locals: Record<string, unknown> = { userId };
  const res = {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next: NextFunction = vi.fn();

  return { req, res, next };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Property 8: Like creation emits correct event payload", () => {
  let likeHandler: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    likeHandler = getLikeHandler();

    // Default: no existing like (so the handler proceeds to create)
    mockLikeFindUnique.mockResolvedValue(null);
    // Default: like.create returns a minimal Like object
    mockLikeCreate.mockImplementation(({ data }: { data: { postId: string; userId: string } }) =>
      Promise.resolve({
        id: "like-id",
        postId: data.postId,
        userId: data.userId,
        createdAt: new Date(),
      })
    );
  });

  it(
    "emitted post:liked payload equals { postId, userId } for any postId/userId pair",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate non-empty string IDs (cuid-like: alphanumeric, reasonable length)
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,40}$/),
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,40}$/),
          async (postId, userId) => {
            // Reset mocks for each iteration
            mockLikeFindUnique.mockResolvedValue(null);
            mockLikeCreate.mockResolvedValue({
              id: "like-id",
              postId,
              userId,
              createdAt: new Date(),
            });

            const { req, res, next } = makeMockReqRes(postId, userId);

            // Capture the emitted event payload
            let capturedPayload: unknown = undefined;
            const listener = (payload: unknown) => {
              capturedPayload = payload;
            };
            postEvents.once("post:liked", listener);

            // Invoke the handler and wait for it to complete
            await new Promise<void>((resolve) => {
              // Wrap res.json to know when the handler has finished
              const originalJson = (res as any).json as vi.Mock;
              originalJson.mockImplementation(() => {
                resolve();
                return res;
              });
              (res as any).status.mockImplementation((code: number) => {
                if (code !== 201) {
                  // If status is not 201, resolve anyway to avoid hanging
                  resolve();
                }
                return res;
              });

              likeHandler(req, res, next);
            });

            // Clean up listener in case it wasn't called
            postEvents.removeListener("post:liked", listener);

            // Verify the payload
            expect(capturedPayload).toEqual({ postId, userId });
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
