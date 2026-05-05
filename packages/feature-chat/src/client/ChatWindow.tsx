"use client";

import { useEffect, useRef } from "react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { formatDateTime } from "@repo/utils";
import { useMessages } from "./useMessages";
import { MessageInput } from "./MessageInput";
import type { Chat as ChatType } from "../shared";

interface ChatWindowProps {
  chat: ChatType;
  userId: string;
  userName: string;
}

export function ChatWindow({ chat, userId, userName }: ChatWindowProps) {
  const { messages, loading, error, sendMessage, sendTyping, typingUsers } = useMessages(
    chat.id,
    userId,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const otherParticipants = chat.participants.filter((p) => p.userId !== userId);
  const displayName =
    chat.name || otherParticipants.map((p) => p.user.name).join(", ") || "Chat";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="font-semibold text-gray-900">{displayName}</h2>
        {chat.isGroup && (
          <p className="text-xs text-gray-500">
            {chat.participants.length} participants
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-2/3 rounded-lg" />
          ))
        ) : error ? (
          <div className="text-red-500 text-sm text-center">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            No messages yet. Say hello! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === userId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isMine
                      ? "bg-amber-500 text-white rounded-br-md"
                      : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                  }`}
                >
                  {!isMine && (
                    <p className="text-xs font-medium text-amber-600 mb-1">
                      {msg.sender.name}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? "text-amber-100" : "text-gray-400"
                    }`}
                  >
                    {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="text-xs text-gray-400 italic">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        onTyping={() => sendTyping(userName)}
      />
    </div>
  );
}
