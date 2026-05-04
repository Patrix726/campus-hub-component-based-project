import { createPrismaClient } from "@repo/db";

const prisma = createPrismaClient();

const participantInclude = {
  user: {
    select: { id: true, name: true, image: true },
  },
} as const;

const messageInclude = {
  sender: {
    select: { id: true, name: true, image: true },
  },
} as const;

/**
 * List all chats for a user, with participants and last message.
 */
export async function listChats(userId: string) {
  const chats = await prisma.chat.findMany({
    where: {
      participants: { some: { userId } },
    },
    include: {
      participants: { include: participantInclude },
      messages: {
        include: messageInclude,
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return chats.map((chat) => ({
    ...chat,
    lastMessage: chat.messages[0] ?? null,
    messages: undefined, // strip the full array
  }));
}

/**
 * Create a chat. For 1-to-1, prevents duplicate pairs.
 */
export async function createChat(
  creatorId: string,
  participantIds: string[],
  name?: string,
  isGroup = false,
) {
  // Ensure creator is included
  const allIds = [...new Set([creatorId, ...participantIds])];

  // For 1-to-1, check if a chat already exists between these two users
  if (!isGroup && allIds.length === 2) {
    const existing = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: allIds.map((uid) => ({
          participants: { some: { userId: uid } },
        })),
      },
      include: {
        participants: { include: participantInclude },
      },
    });
    if (existing) return existing;
  }

  return prisma.chat.create({
    data: {
      name: isGroup ? name : null,
      isGroup,
      participants: {
        create: allIds.map((userId) => ({ userId })),
      },
    },
    include: {
      participants: { include: participantInclude },
    },
  });
}

/**
 * Get paginated messages for a chat.
 */
export async function getMessages(
  chatId: string,
  cursor?: string,
  limit = 50,
) {
  const messages = await prisma.message.findMany({
    where: { chatId },
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return messages.reverse(); // chronological order
}

/**
 * Send a message. Returns the message AND the list of other participant IDs
 * (for realtime emission and notification triggering).
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string,
) {
  const message = await prisma.message.create({
    data: { chatId, senderId, content },
    include: messageInclude,
  });

  // Update chat timestamp
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  // Get other participant IDs for broadcasting
  const participants = await prisma.chatParticipant.findMany({
    where: { chatId },
    select: { userId: true },
  });

  const recipientIds = participants
    .map((p) => p.userId)
    .filter((id) => id !== senderId);

  return { message, recipientIds, allParticipantIds: participants.map((p) => p.userId) };
}

/**
 * Verify a user is a participant of a chat.
 */
export async function isParticipant(chatId: string, userId: string): Promise<boolean> {
  const p = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  return !!p;
}
