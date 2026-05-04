"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtimeEvent } from "@repo/realtime/client";
import type { Chat, ChatMessageEvent } from "../shared";

export function useChats(userId: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data = await res.json();
      setChats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchChats();
  }, [userId, fetchChats]);

  // Realtime: update chat list when a new message arrives
  useRealtimeEvent(
    "chat:message",
    useCallback(
      (data: ChatMessageEvent) => {
        setChats((prev) => {
          const idx = prev.findIndex((c) => c.id === data.chatId);
          if (idx === -1) {
            // New chat we don't know about — refetch
            fetchChats();
            return prev;
          }
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx]!,
            lastMessage: data.message,
            updatedAt: data.message.createdAt,
          };
          // Move to top
          updated.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
          return updated;
        });
      },
      [fetchChats],
    ),
  );

  const createChat = async (participantIds: string[], name?: string, isGroup = false) => {
    const res = await fetch(`/api/chat?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds, name, isGroup }),
    });
    if (!res.ok) throw new Error("Failed to create chat");
    const chat = await res.json();
    setChats((prev) => [chat, ...prev]);
    return chat;
  };

  return { chats, loading, error, createChat, refetch: fetchChats };
}
