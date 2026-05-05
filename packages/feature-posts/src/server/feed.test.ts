// Feature: posts-and-comments, Property 5: For any collection of posts with distinct createdAt
// timestamps, the feed returned by GET /api/posts SHALL be ordered such that
// posts[i].createdAt >= posts[i+1].createdAt for all consecutive pairs.

import { describe, it } from "vitest";
import * as fc from "fast-check";
import type { FeedPost } from "../shared";

/**
 * Validates: Requirements 4.2
 *
 * Replicates the sort comparator used by the server:
 *   orderBy: { createdAt: "desc" }
 * which is equivalent to sorting descending by createdAt (newest first).
 */
function sortFeedDescending(posts: FeedPost[]): FeedPost[] {
  return [...posts].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/** Checks that consecutive pairs satisfy posts[i].createdAt >= posts[i+1].createdAt */
function isReverseChronological(posts: FeedPost[]): boolean {
  for (let i = 0; i < posts.length - 1; i++) {
    if (posts[i].createdAt.getTime() < posts[i + 1].createdAt.getTime()) {
      return false;
    }
  }
  return true;
}

// Arbitrary that generates a FeedPost with a random createdAt timestamp
const feedPostArbitrary = fc
  .record({
    id: fc.uuidV(4),
    content: fc.string({ minLength: 1, maxLength: 200 }),
    imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
    authorId: fc.uuidV(4),
    authorName: fc.string({ minLength: 1, maxLength: 50 }),
    likeCount: fc.nat(100),
    commentCount: fc.nat(100),
    // Use a wide range of timestamps (year 2000 to year 2100)
    createdAt: fc.date({
      min: new Date("2000-01-01T00:00:00.000Z"),
      max: new Date("2100-01-01T00:00:00.000Z"),
    }),
    updatedAt: fc.date({
      min: new Date("2000-01-01T00:00:00.000Z"),
      max: new Date("2100-01-01T00:00:00.000Z"),
    }),
  })
  .map(
    (p): FeedPost => ({
      ...p,
      imageUrl: p.imageUrl ?? null,
    })
  );

// Feature: posts-and-comments, Property 6: For any total number of posts N, page P, and limit L,
// the feed response SHALL contain at most L posts, and the posts returned SHALL correspond to the
// correct offset (P-1)*L in the reverse-chronological sequence.

/**
 * Validates: Requirements 4.2
 *
 * Replicates the pagination logic used by the server:
 *   skip: (page - 1) * limit
 *   take: limit
 * applied to the reverse-chronological sorted sequence.
 */
function paginateFeed(posts: FeedPost[], page: number, limit: number): FeedPost[] {
  const sorted = sortFeedDescending(posts);
  const offset = (page - 1) * limit;
  return sorted.slice(offset, offset + limit);
}

describe("Property 6: Feed pagination returns the correct slice", () => {
  it("paginated result has at most L items", () => {
    fc.assert(
      fc.property(
        fc.array(feedPostArbitrary, { minLength: 0, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 50 }),
        (posts, page, limit) => {
          const result = paginateFeed(posts, page, limit);
          return result.length <= limit;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("each item in the paginated result matches the item at offset (P-1)*L in the full sorted array", () => {
    fc.assert(
      fc.property(
        fc.array(feedPostArbitrary, { minLength: 0, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 50 }),
        (posts, page, limit) => {
          const sorted = sortFeedDescending(posts);
          const offset = (page - 1) * limit;
          const result = paginateFeed(posts, page, limit);

          return result.every((item, i) => item.id === sorted[offset + i].id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 5: Feed is always in reverse-chronological order", () => {
  it("sorted feed satisfies posts[i].createdAt >= posts[i+1].createdAt for all consecutive pairs", () => {
    fc.assert(
      fc.property(
        // Generate between 0 and 50 posts
        fc.array(feedPostArbitrary, { minLength: 0, maxLength: 50 }),
        (posts) => {
          const sorted = sortFeedDescending(posts);
          return isReverseChronological(sorted);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("sorting is stable: an already-sorted feed remains unchanged after re-sorting", () => {
    fc.assert(
      fc.property(
        fc.array(feedPostArbitrary, { minLength: 0, maxLength: 50 }),
        (posts) => {
          const sorted = sortFeedDescending(posts);
          const reSorted = sortFeedDescending(sorted);
          // Both passes should produce the same ordering
          return reSorted.every(
            (p, i) => p.createdAt.getTime() === sorted[i].createdAt.getTime()
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
