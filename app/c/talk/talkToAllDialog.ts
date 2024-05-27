import { dialogTalk } from "../../../lib/llm";
import { system } from "./system";
import { ChatMessage } from "@prisma/client";
import {
  ConversationFull,
  Order
} from "@/lib/types";
import { getSettings, prisma } from "@/lib/db";
import { getFullConversation } from "../_actions/conversation";

function talkToAllDialog(
  conversation: ConversationFull,
  text: string,
  messageCallback: (message: ChatMessage) => void
) {
  return conversation.dialogs
    .filter((dialog) => !dialog.mode.includes("inactive"))
    .map((dialog) => dialogTalk(text, dialog.id)
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
      await system(
        conversation,
        chat,
        subDialogId,
        messageCallback,
        orderCallback
      );
    } else {
      const settings = await getSettings();

      await Promise.allSettled([
        ...talkToAllDialog(conversation, text, messageCallback),
      ]);
    }
  }
}
