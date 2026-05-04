"use client";

import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { truncate } from "@repo/utils";
import { useChats } from "./useChats";
import type { Chat } from "../shared";

interface ChatListProps {
  userId: string;
  selectedChatId?: string;
  onSelectChat: (chat: Chat) => void;
}

export function ChatList({ userId, selectedChatId, onSelectChat }: ChatListProps) {
  const { chats, loading, error } = useChats(userId);

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) return <div className="p-3 text-red-500 text-sm">Error: {error}</div>;

  if (chats.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {chats.map((chat) => {
        const isSelected = chat.id === selectedChatId;
        const otherParticipants = chat.participants.filter((p) => p.userId !== userId);
        const displayName =
          chat.name || otherParticipants.map((p) => p.user.name).join(", ") || "Chat";

        return (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${
              isSelected
                ? "bg-amber-100 border border-amber-300"
                : "hover:bg-gray-100 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-semibold text-sm shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900 truncate">{displayName}</p>
                {chat.lastMessage && (
                  <p className="text-xs text-gray-500 truncate">
                    {chat.lastMessage.sender.name}: {truncate(chat.lastMessage.content, 40)}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
