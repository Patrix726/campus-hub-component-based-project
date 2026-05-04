import { createPrismaClient } from "@repo/db";
import { getRealtimeServer } from "@repo/realtime/server";

const prisma = createPrismaClient();

/**
 * Create a notification, persist to DB, and emit realtime event.
 */
export async function createNotification(
  userId: string,
  type: string,
  data: Record<string, unknown>,
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      data: JSON.stringify(data),
    },
  });

  // Emit realtime event
  try {
    const rt = getRealtimeServer();
    rt.emitToUser(userId, "notification:new", notification);
  } catch {
    // Realtime not available — notification still persisted
  }

  return notification;
}

/**
 * List notifications for a user, newest first.
 */
export async function listNotifications(
  userId: string,
  limit = 50,
  unreadOnly = false,
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

/**
 * Get unread count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}
