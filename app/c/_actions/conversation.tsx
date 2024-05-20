"use server";
import { PrismaClient, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { llm, simpleTalk } from "./llm";

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
            name: "main",
            bot: "llama3-8b-8192-basic",
            system: "",
          },
          {
            name: "revisor",
            bot: "llama3-8b-8192-basic",
            system:
              "Please revise the user's words, fixing the grammar and vocabulary errors.",
            mode: "no-history",
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

async function talkToLMM(
  text: string,
  dialogId: number,
  conversationId: number,
  botName: string
) {
  const answer = await llm(text, dialogId);
  return await saveChatMessage(conversationId, botName, answer);
}

function truncateChatMessages(
  messages: ChatMessage[],
  limit: number
): string[] {
  let k = 0;
  const res: string[] = [];

  for (const item of messages.reverse()) {
    const s = `${item.sender}: ${item.content}`;
    if (k + s.length <= limit) {
      res.push(s);
      k += s.length;
    } else {
      break; // Stop adding items once the limit is exceeded
    }
  }

  return res.reverse();
}

function normalizeString(str: string) {
  return str.replace(/^"|"$/g, "");
}

export type Order = {
  type: string,
  content: string
}

async function system(
  conversation: ConversationFull,
  text: string,
) {
  if (text === "/rename") {
    const messages = truncateChatMessages(
      conversation.chatMessages.filter(
        (value) => value.sender === "main" || value.sender === "user"
      ),
      10000
    ).join("\n");
    const question = `Please give a title to the following conversation. Do not include any additional comments. : \n${messages}`;
    const answer = await simpleTalk("llama3-8b-8192-basic", question);
    return { type: "rename", content: normalizeString(answer) };
  }
}

export async function talk(
  conversationId: number,
  text: string,
  messageCallback: (message: ChatMessage) => void,
  orderCallback: (order: Order) => void,
  end: () => void
) {
  const conversation = await getFullConversation(conversationId);
  if (conversation) {
    const chat = await saveChatMessage(conversation.id, "user", text);
    messageCallback(chat);
    await Promise.allSettled([
      ...conversation.dialogs.map((dialog) =>
        talkToLMM(text, dialog.id, conversation.id, dialog.name).then(
          (chat) => {
            messageCallback(chat);
          }
        )
      ),
      system(conversation, text).then((order) => {
        if (order) {
          orderCallback(order)
        }
      }),
    ]);
  }
  end();
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
