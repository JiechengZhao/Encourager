"use server";
import { PrismaClient, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
const prisma = new PrismaClient();

const conversationWithUserSelect = {
  id: true,
  title: true,
  description: true,
  updatedAt: true,
};

export type ConversationWithUser = Prisma.ConversationGetPayload<{
  select: typeof conversationWithUserSelect;
}>;

export async function getLastKTouchedConversations(k: number) {
  const conversations = await prisma.conversation.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    take: k,
    select: conversationWithUserSelect,
  });

  return conversations;
}

export async function createNewConversation(title?: string, description? : string) {
  const conversation = await prisma.conversation.create({
    data: {
      title: title || `undefined-${nanoid()}`,
      description,
    },
  });
  return conversation
}
