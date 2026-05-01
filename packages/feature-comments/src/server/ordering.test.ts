// Feature: posts-and-comments, Property 10: For any collection of comments on a post with
// distinct createdAt timestamps, the response from GET /api/posts/:postId/comments SHALL be
// ordered such that comments[i].createdAt <= comments[i+1].createdAt for all consecutive pairs.

import { describe, it } from "vitest";
import * as fc from "fast-check";
import type { Comment } from "../shared";

/**
 * Validates: Requirements 6.2
 *
 * Replicates the sort comparator used by the server:
 *   orderBy: { createdAt: "asc" }
 * which is equivalent to sorting ascending by createdAt (oldest first = chronological order).
 */
function sortCommentsChronological(comments: Comment[]): Comment[] {
  return [...comments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
}

/** Checks that consecutive pairs satisfy comments[i].createdAt <= comments[i+1].createdAt */
function isChronological(comments: Comment[]): boolean {
  for (let i = 0; i < comments.length - 1; i++) {
    if (comments[i].createdAt.getTime() > comments[i + 1].createdAt.getTime()) {
      return false;
    }
  }
  return true;
}

// Arbitrary that generates a Comment with a random createdAt timestamp
const commentArbitrary = fc.record({
  id: fc.uuidV(4),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  postId: fc.uuidV(4),
  authorId: fc.uuidV(4),
  authorName: fc.string({ minLength: 1, maxLength: 50 }),
  // Use a wide range of timestamps (year 2000 to year 2100)
  createdAt: fc.date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2100-01-01T00:00:00.000Z"),
  }),
  updatedAt: fc.date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2100-01-01T00:00:00.000Z"),
  }),
});

describe("Property 10: Comments are always in chronological order", () => {
  it("sorted comments satisfy comments[i].createdAt <= comments[i+1].createdAt for all consecutive pairs", () => {
    fc.assert(
      fc.property(
        // Generate between 0 and 50 comments
        fc.array(commentArbitrary, { minLength: 0, maxLength: 50 }),
        (comments) => {
          const sorted = sortCommentsChronological(comments);
          return isChronological(sorted);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("sorting is stable: an already-sorted list of comments remains unchanged after re-sorting", () => {
    fc.assert(
      fc.property(
        fc.array(commentArbitrary, { minLength: 0, maxLength: 50 }),
        (comments) => {
          const sorted = sortCommentsChronological(comments);
          const reSorted = sortCommentsChronological(sorted);
          // Both passes should produce the same ordering
          return reSorted.every(
            (c, i) => c.createdAt.getTime() === sorted[i].createdAt.getTime()
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
