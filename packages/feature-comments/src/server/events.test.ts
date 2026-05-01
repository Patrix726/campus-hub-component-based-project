// Feature: posts-and-comments, Property 9: For any valid comment input and postId, when a
// comment is created via POST /api/posts/:postId/comments, the comment:new event emitted on
// commentEvents SHALL have a payload of exactly { commentId, postId, authorId } matching the
// created comment.

/**
 * Validates: Requirements 6.1, 7.4
 *
 * Strategy:
 * - Mock @repo/db so no real database is needed.
 * - Import commentEvents from the server module (the same EventEmitter instance used by the handler).
 * - Extract the POST /api/posts/:postId/comments route handler from the Express router by
 *   inspecting router.stack.
 * - For each generated (postId, content, authorId) triple:
 *     1. Set up a one-time listener on commentEvents for "comment:new".
 *     2. Build mock req/res objects with the correct params, body, and locals.
 *     3. Invoke the handler.
 *     4. Capture the emitted event payload.
 *     5. Verify the payload equals { commentId, postId, authorId } where commentId matches
 *        the id returned by the mocked prisma.comment.create.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import type { Request, Response, NextFunction } from "express";

// ── Mock @repo/db before importing the server module ─────────────────────────
// Use vi.hoisted so the mock variables are available when vi.mock factory runs
// (vi.mock calls are hoisted to the top of the file by Vitest's transformer).

const { mockCommentCreate } = vi.hoisted(() => ({
  mockCommentCreate: vi.fn(),
}));

vi.mock("@repo/db", () => ({
  createPrismaClient: () => ({
    comment: {
      create: mockCommentCreate,
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  }),
}));

// Import after mocking so the module picks up the mock
import { commentEvents, commentRoutes } from "./index";

// ── Helper: extract the comment creation handler from the Express router ──────

/**
 * Walks the router's internal stack to find the handler registered for
 * POST /api/posts/:postId/comments and returns it.
 */
function getCreateCommentHandler(): (req: Request, res: Response, next: NextFunction) => void {
  // Express Router stores layers in router.stack; each layer has a route property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack = (commentRoutes as any).stack as any[];
  for (const layer of stack) {
    if (
      layer.route &&
      layer.route.path === "/api/posts/:postId/comments" &&
      layer.route.methods?.post
    ) {
      // The route's stack contains the actual handler(s)
      const routeStack = layer.route.stack as any[];
      const handlerLayer = routeStack[routeStack.length - 1];
      return handlerLayer.handle;
    }
  }
  throw new Error("Could not find POST /api/posts/:postId/comments handler in router stack");
}

// ── Helper: build minimal mock req/res objects ────────────────────────────────

function makeMockReqRes(postId: string, content: string, authorId: string) {
  const req = {
    params: { postId },
    body: { content },
    query: {},
  } as unknown as Request;

  const locals: Record<string, unknown> = { userId: authorId };
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

describe("Property 9: Comment creation emits correct event payload", () => {
  let createCommentHandler: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    createCommentHandler = getCreateCommentHandler();
  });

  it(
    "emitted comment:new payload equals { commentId, postId, authorId } for any valid inputs",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate non-empty string IDs (alphanumeric, reasonable length)
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,40}$/),
          // Generate valid comment content (non-empty, max 1000 chars)
          fc.string({ minLength: 1, maxLength: 1000 }),
          // Generate author ID
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,40}$/),
          async (postId, content, authorId) => {
            const commentId = `comment-${postId}-${authorId}`;

            // Set up mock to return a comment with a known id
            mockCommentCreate.mockResolvedValue({
              id: commentId,
              content,
              postId,
              authorId,
              author: { name: "Test User" },
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            const { req, res, next } = makeMockReqRes(postId, content, authorId);

            // Capture the emitted event payload
            let capturedPayload: unknown = undefined;
            const listener = (payload: unknown) => {
              capturedPayload = payload;
            };
            commentEvents.once("comment:new", listener);

            // Invoke the handler and wait for it to complete
            await new Promise<void>((resolve) => {
              // Wrap res.json to know when the handler has finished
              const originalJson = (res as any).json as ReturnType<typeof vi.fn>;
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

              createCommentHandler(req, res, next);
            });

            // Clean up listener in case it wasn't called
            commentEvents.removeListener("comment:new", listener);

            // Verify the payload matches exactly { commentId, postId, authorId }
            expect(capturedPayload).toEqual({ commentId, postId, authorId });
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
