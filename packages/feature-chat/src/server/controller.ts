import type { Request, Response } from "express";
import { z } from "zod";
import * as chatService from "./services";
import { getRealtimeServer, getEventBus } from "@repo/realtime/server";

const createChatSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  name: z.string().optional(),
  isGroup: z.boolean().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

/** GET /api/chat */
export async function listChats(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const chats = await chatService.listChats(userId);
    res.json(chats);
  } catch (error) {
    console.error("listChats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** POST /api/chat */
export async function createChat(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const data = createChatSchema.parse(req.body);
    const chat = await chatService.createChat(
      userId,
      data.participantIds,
      data.name,
      data.isGroup,
    );
    res.status(201).json(chat);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("createChat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** GET /api/chat/:id/messages */
export async function getMessages(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Chat ID required" });

    // Verify membership
    const isMember = await chatService.isParticipant(id, userId);
    if (!isMember) return res.status(403).json({ error: "Not a participant" });

    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const messages = await chatService.getMessages(id, cursor, limit);
    res.json(messages);
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** POST /api/chat/:id/messages */
export async function sendMessage(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { id: chatId } = req.params;
    if (!chatId) return res.status(400).json({ error: "Chat ID required" });

    // Verify membership
    const isMember = await chatService.isParticipant(chatId, userId);
    if (!isMember) return res.status(403).json({ error: "Not a participant" });

    const data = sendMessageSchema.parse(req.body);

    const { message, recipientIds, allParticipantIds } = await chatService.sendMessage(
      chatId,
      userId,
      data.content,
    );

    // Emit realtime event to ALL participants (including sender for multi-device)
    const rt = getRealtimeServer();
    rt.emitToUsers(allParticipantIds, "chat:message", {
      chatId,
      message,
    });

    // Trigger notification for recipients via the internal event bus.
    // NO cross-feature imports — uses the shared in-process event bus.
    // The notification feature registers a listener for this event at startup.
    const bus = getEventBus();
    for (const recipientId of recipientIds) {
      bus.emitInternal("internal:notification:create", {
        userId: recipientId,
        type: "chat_message",
        data: {
          chatId,
          messageId: message.id,
          senderName: message.sender.name,
          content: data.content.substring(0, 100),
        },
      });
    }

    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("sendMessage error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
