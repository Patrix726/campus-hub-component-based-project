// Feature: posts-and-comments, Property 1: createPostSchema accepts all valid inputs
// Feature: posts-and-comments, Property 2: createPostSchema rejects all invalid inputs

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { ZodError } from "zod";
import { createPostSchema } from "./index.js";

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Non-empty string with length between 1 and 2000 characters. */
const validContent = fc.string({ minLength: 1, maxLength: 2000 });

/** Valid URL strings using http or https scheme. */
const validUrl = fc.webUrl({ validSchemes: ["http", "https"] });

/** String that is empty (length 0). */
const emptyContent = fc.constant("");

/** String that exceeds the 2000-character limit. */
const tooLongContent = fc.string({ minLength: 2001, maxLength: 4000 });

/**
 * Strings that are definitively not valid URLs.
 * We generate plain alphanumeric words (no colon, no slash) so Zod's URL
 * validator reliably rejects them regardless of its internal leniency.
 */
const invalidUrl = fc
  .stringOf(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")), {
    minLength: 1,
    maxLength: 50,
  })
  .filter((s) => s.length > 0);

// ── Property 1: createPostSchema accepts all valid inputs ─────────────────────

describe("createPostSchema", () => {
  describe("Property 1 — accepts all valid inputs", () => {
    it("accepts non-empty content strings up to 2000 chars without imageUrl", () => {
      fc.assert(
        fc.property(validContent, (content) => {
          const result = createPostSchema.safeParse({ content });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.content).toBe(content);
            expect(result.data.imageUrl).toBeUndefined();
          }
        }),
        { numRuns: 100 }
      );
    });

    it("accepts non-empty content strings up to 2000 chars with a valid imageUrl", () => {
      fc.assert(
        fc.property(validContent, validUrl, (content, imageUrl) => {
          const result = createPostSchema.safeParse({ content, imageUrl });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.content).toBe(content);
            expect(result.data.imageUrl).toBe(imageUrl);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 2: createPostSchema rejects all invalid inputs ──────────────────

  describe("Property 2 — rejects all invalid inputs", () => {
    it("rejects empty content strings", () => {
      fc.assert(
        fc.property(emptyContent, (content) => {
          const result = createPostSchema.safeParse({ content });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("rejects content strings longer than 2000 characters", () => {
      fc.assert(
        fc.property(tooLongContent, (content) => {
          const result = createPostSchema.safeParse({ content });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("rejects invalid imageUrl values", () => {
      fc.assert(
        fc.property(validContent, invalidUrl, (content, imageUrl) => {
          const result = createPostSchema.safeParse({ content, imageUrl });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("rejects missing content field entirely", () => {
      const result = createPostSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });
  });
});
