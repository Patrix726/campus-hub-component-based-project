import { z } from "zod";

// ── Zod schemas ──────────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(1000),
});

// ── TypeScript types ─────────────────────────────────────────────────────────

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export type Comment = {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};
