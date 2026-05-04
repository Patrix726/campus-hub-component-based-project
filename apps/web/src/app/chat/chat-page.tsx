"use client";

import { useState } from "react";
import { Card } from "@repo/ui/components/card";
import { ChatList } from "@repo/feature-chat/client";
import { ChatWindow } from "@repo/feature-chat/client";
import type { Chat } from "@repo/feature-chat/shared";

interface ChatPageProps {
  user: { id: string; name: string; email: string };
}

export default function ChatPage({ user }: ChatPageProps) {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  return (
    <div className="container mx-auto p-4 h-[calc(100svh-65px)]">
      <Card className="h-full flex overflow-hidden rounded-xl border border-gray-200">
        {/* Sidebar — Chat List */}
        <div className="w-80 border-r bg-white flex flex-col shrink-0">
          <div className="p-4 border-b">
            <h1 className="font-bold text-lg text-gray-900">Messages</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatList
              userId={user.id}
              selectedChatId={selectedChat?.id}
              onSelectChat={setSelectedChat}
            />
          </div>
        </div>

        {/* Main — Chat Window */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              userId={user.id}
              userName={user.name}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-4 text-gray-300"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
