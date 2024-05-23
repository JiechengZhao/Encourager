"use server";
import { nanoid } from "nanoid";
import { dialogTalk } from "../../../lib/llm";
import dialogTemplates from "../../../lib/dialogTemplates";
import { system } from "./system";
import { ChatMessage } from "@prisma/client";
import {
  conversationFullInclude,
  conversationShortSelect,
  ConversationFull,
  Order,
} from "@/lib/types";

import { getSettings, prisma } from "@/lib/db";

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

function talkToAllDialog(
  conversation: ConversationFull,
  text: string,
  messageCallback: (message: ChatMessage) => void
) {
  return conversation.dialogs
    .filter((dialog) => !dialog.mode.includes("inactive"))
    .map((dialog) =>
      dialogTalk(text, dialog.id)
        .then((answer) => {
          return prisma.chatMessage.create({
            data: {
              sender: dialog.name,
              content: answer,
              conversationId: conversation.id,
            },
          });
        })
        .then((chat) => {
          messageCallback(chat);
        })
    );
}

export async function talk(
  conversationId: number,
  text: string,
  subDialogId: number | undefined,
  messageCallback: (message: ChatMessage) => void,
  orderCallback: (order: Order) => void
) {
  const conversation = await getFullConversation(conversationId);

  if (conversation) {
    const chat = await prisma.chatMessage.create({
      data: {
        sender: "user",
        content: text,
        conversationId: conversation.id,
        subDialogId,
      },
    });
    messageCallback(chat);

    if (subDialogId || text.startsWith("/")) {
      await system(conversation, chat, subDialogId, orderCallback);
    } else {
      const settings = await getSettings();

      await Promise.allSettled([
        ...talkToAllDialog(conversation, text, messageCallback),
        settings.systemListen
          ? system(conversation, chat, subDialogId, orderCallback)
          : null,
      ]);
    }
  }
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
