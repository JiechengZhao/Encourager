"use server";
import { PrismaClient, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { llm } from "./llm";

const prisma = new PrismaClient();

const conversationShortSelect = {
  id: true,
  title: true,
  description: true,
  updatedAt: true,
};

export type ConversationShort = Prisma.ConversationGetPayload<{
  select: typeof conversationShortSelect;
}>;

export type ChatMessage = Prisma.ChatMessageGetPayload<{}>;

export async function getLastKTouchedConversations(k: number) {
  const conversations = await prisma.conversation.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    take: k,
    select: conversationShortSelect,
  });

  return conversations;
}

export async function createNewConversation(
  title?: string,
  description?: string
) {
  const conversation = await prisma.conversation.create({
    data: {
      title: title || `undefined-${nanoid()}`,
      description,
      dialogs: {
        create: [
          {
            bot: "llama3-8b-8192-basic",
            system: "",
          },
        ],
      },
    },
  });
  return conversation;
}

const conversationFullInclude = {
  dialogs: true,
  chatMessages: true,
};
export type ConversationFull = Prisma.ConversationGetPayload<{
  include: typeof conversationFullInclude;
}>;
export async function talkToLMM(
  text: string,
  dialogId: number,
  conversationId: number,
  dialogBot: string
) {
  const answer = await llm(text, dialogId);
  return await saveChatMessage(conversationId, dialogBot, answer);
}

export async function getFullConversation(id: number) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id,
    },
    include: conversationFullInclude,
  });
  return conversation;
}

export async function saveChatMessage(
  conversationId: number,
  sender: string,
  content: string
) {
  return await prisma.chatMessage.create({
    data: {
      sender,
      content,
      conversationId,
    },
  });
}
