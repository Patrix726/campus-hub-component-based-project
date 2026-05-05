import { createPrismaClient } from "@repo/db";
import { Router } from "express";
import { EventEmitter } from "node:events";
import { z } from "zod";
import { createCommentSchema } from "../shared";

const router = Router();
const prisma = createPrismaClient();

// ── Event emitter ─────────────────────────────────────────────────────────────

/** Emits `comment:new` with payload `{ commentId: string; postId: string; authorId: string }`. */
export const commentEvents = new EventEmitter();

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/posts/:postId/comments — list comments in chronological order */
router.get("/api/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true } } },
    });

    const result = comments.map((c) => ({
      id: c.id,
      content: c.content,
      postId: c.postId,
      authorId: c.authorId,
      authorName: c.author.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/posts/:postId/comments — create a comment */
router.post("/api/posts/:postId/comments", async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { postId } = req.params;
    const data = createCommentSchema.parse(req.body);

    const comment = await prisma.comment.create({
      data: { content: data.content, postId, authorId: userId },
      include: { author: { select: { name: true } } },
    });

    commentEvents.emit("comment:new", {
      commentId: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
    });

    res.status(201).json({
      id: comment.id,
      content: comment.content,
      postId: comment.postId,
      authorId: comment.authorId,
      authorName: comment.author.name,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/posts/:postId/comments/:commentId — delete own comment */
router.delete("/api/posts/:postId/comments/:commentId", async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (comment.authorId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export const commentRoutes: Router = router;
