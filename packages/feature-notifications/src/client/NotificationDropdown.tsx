"use client";

import { formatDateTime } from "@repo/utils";
import type { Notification } from "../shared";

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

function parseNotificationData(data: string): Record<string, unknown> {
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function getNotificationText(notification: Notification): string {
  const data = parseNotificationData(notification.data);

  switch (notification.type) {
    case "chat_message": {
      const senderName = (data.senderName as string) || "Someone";
      const content = (data.content as string) || "sent a message";
      return `${senderName}: ${content}`;
    }
    case "post_like":
      return "Someone liked your post";
    case "event_invite":
      return "You've been invited to an event";
    default:
      return "New notification";
  }
}

export function NotificationDropdown({ notifications, onMarkAsRead }: NotificationDropdownProps) {
  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No notifications
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          onClick={() => !notification.read && onMarkAsRead(notification.id)}
          className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors hover:bg-gray-50 ${
            notification.read ? "opacity-60" : "bg-amber-50/50"
          }`}
        >
          <p className="text-sm text-gray-900">
            {getNotificationText(notification)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {formatDateTime(notification.createdAt)}
          </p>
          {!notification.read && (
            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mt-1" />
          )}
        </button>
      ))}
    </div>
  );
}
