// Feature: posts-and-comments, Property 3: createCommentSchema accepts all valid inputs
// Feature: posts-and-comments, Property 4: createCommentSchema rejects all invalid inputs

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { ZodError } from "zod";
import { createCommentSchema } from "./index.js";

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Non-empty string with length between 1 and 1000 characters. */
const validContent = fc.string({ minLength: 1, maxLength: 1000 });

/** String that is empty (length 0). */
const emptyContent = fc.constant("");

/** String that exceeds the 1000-character limit. */
const tooLongContent = fc.string({ minLength: 1001, maxLength: 2000 });

// ── Property 3: createCommentSchema accepts all valid inputs ──────────────────

describe("createCommentSchema", () => {
  describe("Property 3 — accepts all valid inputs", () => {
    it("accepts non-empty content strings up to 1000 chars", () => {
      fc.assert(
        fc.property(validContent, (content) => {
          const result = createCommentSchema.safeParse({ content });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.content).toBe(content);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 4: createCommentSchema rejects all invalid inputs ────────────────

  describe("Property 4 — rejects all invalid inputs", () => {
    it("rejects empty content strings", () => {
      fc.assert(
        fc.property(emptyContent, (content) => {
          const result = createCommentSchema.safeParse({ content });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("rejects content strings longer than 1000 characters", () => {
      fc.assert(
        fc.property(tooLongContent, (content) => {
          const result = createCommentSchema.safeParse({ content });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("rejects missing content field entirely", () => {
      const result = createCommentSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });
  });
});
