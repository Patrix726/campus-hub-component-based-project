export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
};

export type Chat = {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage | null;
};

export type ChatParticipant = {
  id: string;
  userId: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
};

export type CreateChatInput = {
  participantIds: string[];
  name?: string;
  isGroup?: boolean;
};

export type SendMessageInput = {
  content: string;
};

// Realtime event payloads
export type ChatMessageEvent = {
  chatId: string;
  message: ChatMessage;
};

export type ChatTypingEvent = {
  chatId: string;
  userId: string;
  userName: string;
};
