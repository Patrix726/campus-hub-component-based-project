import type { Request, Response } from "express";
import * as notificationService from "./services";

/** GET /api/notifications */
export async function listNotifications(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const unreadOnly = req.query.unreadOnly === "true";
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const notifications = await notificationService.listNotifications(userId, limit, unreadOnly);
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("listNotifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** PATCH /api/notifications/:id/read */
export async function markAsRead(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Notification ID required" });

    const notification = await notificationService.markAsRead(id, userId);
    res.json(notification);
  } catch (error) {
    console.error("markAsRead error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
