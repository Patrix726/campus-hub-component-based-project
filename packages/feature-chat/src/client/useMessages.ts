"use client";

import { env } from "@repo/env/web";
import { useState, useEffect, useCallback } from "react";
import { useRealtimeEvent, useRealtime } from "@repo/realtime/client";
import type { ChatMessage, ChatMessageEvent, ChatTypingEvent } from "../shared";

export function useMessages(chatId: string, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const { send } = useRealtime();

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/chat/${chatId}/messages?userId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [chatId, userId]);

  useEffect(() => {
    if (chatId) fetchMessages();
  }, [chatId, fetchMessages]);

  // Realtime: new messages
  useRealtimeEvent(
    "chat:message",
    useCallback(
      (data: ChatMessageEvent) => {
        if (data.chatId === chatId) {
          setMessages((prev) => {
            // Deduplicate
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          // Clear typing for this sender
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(data.message.senderId);
            return next;
          });
        }
      },
      [chatId],
    ),
  );

  // Realtime: typing indicators
  useRealtimeEvent(
    "chat:typing",
    useCallback(
      (data: ChatTypingEvent) => {
        if (data.chatId === chatId && data.userId !== userId) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.set(data.userId, data.userName);
            // Auto-clear after 3s
            setTimeout(() => {
              setTypingUsers((curr) => {
                const updated = new Map(curr);
                updated.delete(data.userId);
                return updated;
              });
            }, 3000);
            return next;
          });
        }
      },
      [chatId, userId],
    ),
  );

  const sendMessage = async (content: string) => {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SERVER_URL}/api/chat/${chatId}/messages?userId=${encodeURIComponent(userId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );
    if (!res.ok) throw new Error("Failed to send message");
    // Message will arrive via realtime
    return res.json();
  };

  const sendTyping = (userName: string) => {
    send("chat:typing", { chatId, userName });
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendTyping,
    typingUsers: Array.from(typingUsers.values()),
    refetch: fetchMessages,
  };
}
