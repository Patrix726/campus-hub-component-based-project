// apps/server/src/routes/tasks.ts
import { Router } from "express";
import { db } from "@campus-hub/db";
import { auth } from "@campus-hub/auth";

const router = Router();

// Get all tasks for the authenticated user
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, sortBy } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const orderBy: any = { createdAt: "desc" };
    if (sortBy === "dueDate") orderBy.dueDate = "asc";
    if (sortBy === "priority") orderBy.priority = "asc";

    const tasks = await db.task.findMany({
      where,
      orderBy,
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get single task
router.get("/:id", auth, async (req, res) => {
  try {
    const task = await db.task.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Create new task
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const task = await db.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "medium",
        userId: req.user.id,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, description, status, dueDate, priority } = req.body;

    const task = await db.task.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!task) return res.status(404).json({ error: "Task not found" });

    const updatedTask = await db.task.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(priority && { priority }),
      },
    });

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete task
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await db.task.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!task) return res.status(404).json({ error: "Task not found" });

    await db.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
