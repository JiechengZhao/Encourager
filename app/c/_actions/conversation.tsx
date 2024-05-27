"use server";
import { nanoid } from "nanoid";
import dialogTemplates from "../../../lib/dialogTemplates";
import {
  conversationFullInclude,
  conversationShortSelect,
} from "@/lib/types";

import { prisma } from "@/lib/db";

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
        create: [dialogTemplates.main],
      },
    },
  });
  return conversation;
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
