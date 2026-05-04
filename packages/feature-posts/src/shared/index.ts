import { z } from "zod";

// ── Zod schemas ──────────────────────────────────────────────────────────────

export const createPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000),
  imageUrl: z.string().url().optional(),
});

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// ── TypeScript types ─────────────────────────────────────────────────────────

export type CreatePostInput = z.infer<typeof createPostSchema>;

export type FeedQuery = z.infer<typeof feedQuerySchema>;

export type Post = {
  id: string;
  content: string;
  imageUrl?: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Post shape returned in feed/detail responses (includes computed fields). */
export type FeedPost = Post & {
  authorName: string;
  likeCount: number;
  commentCount: number;
};

export type Like = {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
};
