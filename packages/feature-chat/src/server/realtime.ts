import { getRealtimeServer } from "@repo/realtime/server";
import * as chatService from "./services";

/**
 * Register chat realtime handlers.
 * Called once at server startup after the realtime server is initialized.
 */
export function registerChatRealtimeHandlers() {
  const rt = getRealtimeServer();

  // Handle typing indicators from clients
  rt.on("chat:typing", async (data: unknown, userId: string) => {
    const { chatId, userName } = data as { chatId: string; userName: string };

    // Verify user is a participant
    const isMember = await chatService.isParticipant(chatId, userId);
    if (!isMember) return;

    // Broadcast to other participants (not sender)
    const chats = await chatService.listChats(userId);
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const otherIds = chat.participants
      .map((p) => p.userId)
      .filter((id) => id !== userId);

    rt.emitToUsers(otherIds, "chat:typing", { chatId, userId, userName });
  });
}
