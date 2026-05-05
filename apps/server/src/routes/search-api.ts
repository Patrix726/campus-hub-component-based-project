// apps/server/src/routes/search.ts
import { Router } from "express";
import { createPrismaClient } from "@repo/db";

const router = Router();
const db = createPrismaClient()

// Global search across users, posts, and tasks
router.get("/", async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const query = q.toLowerCase();
    const results: any = {};

    // Search users by name or email
    if (!type || type === "users") {
      results.users = await db.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          profile: true,
        },
        take: 10,
      });
    }

    // Search posts by content
    if (!type || type === "posts") {
      results.posts = await db.post.findMany({
        where: {
          content: { contains: query, mode: "insensitive" },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
        take: 10,
      });
    }

    // Search tasks by title or description
    if (!type || type === "tasks") {
      results.tasks = await db.task.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        take: 10,
      });
    }

    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to perform search" });
  }
});

export default router;
