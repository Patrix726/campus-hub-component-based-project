"use client";
import { useState, useEffect, useCallback } from "react";
import { useRealtimeEvent } from "@repo/realtime/client";
import type { Notification } from "../shared";
import { env } from "@repo/env/web";

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/notifications?userId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchNotifications();
  }, [userId, fetchNotifications]);

  // Realtime: new notification
  useRealtimeEvent(
    "notification:new",
    useCallback(
      (data: Notification) => {
        setNotifications((prev) => {
          // Deduplicate
          if (prev.some((n) => n.id === data.id)) return prev;
          return [data, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      },
      [],
    ),
  );

  const markAsRead = async (notificationId: string) => {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SERVER_URL}/api/notifications/${notificationId}/read?userId=${encodeURIComponent(userId)}`,
      { method: "PATCH" },
    );
    if (!res.ok) throw new Error("Failed to mark as read");

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    refetch: fetchNotifications,
  };
}
