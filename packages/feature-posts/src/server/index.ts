import { createPrismaClient } from "@repo/db";
import { Router } from "express";
import { EventEmitter } from "node:events";
import { z } from "zod";
import { createPostSchema, feedQuerySchema } from "../shared";

const router = Router();
const prisma = createPrismaClient();

// ── Event emitter ─────────────────────────────────────────────────────────────

/** Emits `post:liked` with payload `{ postId: string; userId: string }`. */
export const postEvents = new EventEmitter();

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/posts — paginated feed in reverse-chronological order */
router.get("/api/posts", async (req, res) => {
  try {
    const query = feedQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      include: {
        author: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const feed = posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      authorId: p.authorId,
      authorName: p.author.name,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json(feed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/posts/:postId — single post detail */
router.get("/api/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      authorId: post.authorId,
      authorName: post.author.name,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/posts — create a new post */
router.post("/api/posts", async (req, res) => {
  try {
    const userId = res.locals.userId as string;

    const data = createPostSchema.parse(req.body);

    const post = await prisma.post.create({
      data: { ...data, authorId: userId },
    });

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/posts/:postId — delete own post */
router.delete("/api/posts/:postId", async (req, res) => {
  try {
    const userId = res.locals.userId as string;

    const { postId } = req.params;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (post.authorId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.post.delete({ where: { id: postId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/posts/:postId/like — like a post */
router.post("/api/posts/:postId/like", async (req, res) => {
  try {
    const userId = res.locals.userId as string;

    const { postId } = req.params;

    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      return res.status(409).json({ error: "Already liked" });
    }

    const like = await prisma.like.create({ data: { postId, userId } });

    postEvents.emit("post:liked", { postId, userId });

    res.status(201).json(like);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/posts/:postId/like — unlike a post */
router.delete("/api/posts/:postId/like", async (req, res) => {
  try {
    const userId = res.locals.userId as string;

    const { postId } = req.params;

    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      return res.status(404).json({ error: "Like not found" });
    }

    await prisma.like.delete({ where: { postId_userId: { postId, userId } } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export const postRoutes: Router = router;
