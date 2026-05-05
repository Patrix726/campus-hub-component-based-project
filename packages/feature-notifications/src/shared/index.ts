export type Notification = {
  id: string;
  userId: string;
  type: string;
  data: string; // JSON string
  read: boolean;
  createdAt: string;
};

export type NotificationType = "chat_message" | "post_like" | "event_invite" | "system";

export type CreateNotificationInput = {
  userId: string;
  type: string;
  data: Record<string, unknown>;
};

// Realtime event payload
export type NotificationNewEvent = Notification;
