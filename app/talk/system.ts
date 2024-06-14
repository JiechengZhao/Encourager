import { ConversationFull, Dialog, Order } from "@/lib/types";

import { prisma } from "@/lib/db";
import { ChatMessage, SubDialog } from "@prisma/client";
import { RenameAgent } from "./rename";
import { AddAgentAgent } from "./addAgent";
import { BaseSystemAgent } from "./baseSystemAgent";
import { TaskManager } from "./taskManager";

function normalizeString(str: string) {
  return str.replace(/^"|"$/g, "");
}

export async function newDialog(
  conversation: ConversationFull,
  task: string,
  chat: ChatMessage,
  orderCallback: (order: Order) => void
) {
  const dialog = await prisma.subDialog.create({
    data: {
      conversationId: conversation.id,
      task: task,
      status: "OPEN",
    },
  });
  await prisma.chatMessage.update({
    where: {
      id: chat.id,
    },
    data: {
      subDialogId: dialog.id,
    },
  });

  orderCallback({ type: "open-dialog", content: dialog.id });
  return dialog;
}

const nameToAgentClass: Record<
  string,
  new (
    conversation: ConversationFull,
    dialog: SubDialog,
    messageCallback: (message: ChatMessage) => void,
    orderCallback: (order: Order) => void
  ) => BaseSystemAgent
> = {
  rename: RenameAgent,
  "add-agent": AddAgentAgent,
  task: TaskManager,
};

async function systemAction(
  AgentClass: new (
    conversation: ConversationFull,
    dialog: SubDialog,
    messageCallback: (message: ChatMessage) => void,
    orderCallback: (order: Order) => void
  ) => BaseSystemAgent,
  conversation: ConversationFull,
  dialog: SubDialog,
  messageCallback: (message: ChatMessage) => void,
  orderCallback: (order: Order) => void
) {
  const manager = new AgentClass(
    conversation,
    dialog,
    messageCallback,
    orderCallback
  );
  await manager.init();
  await manager.act();
}

export async function system(
  conversation: ConversationFull,
  chat: ChatMessage,
  subDialogId: number | undefined,
  messageCallback: (message: ChatMessage) => void,
  orderCallback: (order: Order) => void
) {
  let dialog;
  if (subDialogId) {
    dialog = await prisma.subDialog.findUnique({
      where: {
        id: subDialogId,
      },
    });
    if (!dialog) {
      throw new Error("Unknown Dialog Id");
    }
  } else {
    if (chat.content.startsWith("/rename")) {
      dialog = await newDialog(conversation, "rename", chat, orderCallback);
    } else if (chat.content.startsWith("/add-agent")) {
      dialog = await newDialog(conversation, "add-agent", chat, orderCallback);
    } else if (chat.content.startsWith("/task")) {
      dialog = await newDialog(conversation, "task", chat, orderCallback);
    }
    if (!dialog) {
      return;
    }
  }

  const agentClass = nameToAgentClass[dialog.task];
  if (agentClass) {
    return await systemAction(
      agentClass,
      conversation,
      dialog,
      messageCallback,
      orderCallback
    );
  }
}

export async function agentNew(
  agentName: string,
  conversation: ConversationFull,
  chat: ChatMessage,
  messageCallback: (message: ChatMessage) => void,
  orderCallback: (order: Order) => void
) {
  const dialog = await newDialog(conversation, agentName, chat, orderCallback);
  const agentClass = nameToAgentClass[dialog.task];
  if (agentClass) {
    return await systemAction(
      agentClass,
      conversation,
      dialog,
      messageCallback,
      orderCallback
    );
  }
}
