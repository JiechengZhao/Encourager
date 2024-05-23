import { ConversationFull, Order } from "@/lib/types";

import dialogTemplates from "@/lib/dialogTemplates";
import { simpleTalk } from "@/lib/llm";
import { prisma } from "@/lib/db";
import { SubDialog, ChatMessage } from "@prisma/client";

function normalizeString(str: string) {
  return str.replace(/^"|"$/g, "");
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

export async function system(
  conversation: ConversationFull,
  chat: ChatMessage,
  subDialogId: number | undefined,
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
      throw Error("Unknown Dialog Id");
    }
  } else {
    if (chat.content.startsWith("/rename")) {
      dialog = await prisma.subDialog.create({
        data: {
          conversationId: conversation.id,
          task: "rename",
          status: "OPEN",
        },
      });
    } else if (chat.content.startsWith("/add-agent")) {
      dialog = await prisma.subDialog.create({
        data: {
          conversationId: conversation.id,
          task: "add-agent",
          status: "OPEN",
        },
      });
    }
    if (dialog) {
      await prisma.chatMessage.update({
        where: {
          id: chat.id,
        },
        data: {
          subDialogId: dialog.id,
        },
      });
    } else {
      return;
    }
  }
  const chatMessages = await prisma.chatMessage.findMany({
    where: {
      subDialogId: subDialogId,
    },
    orderBy: {
      id: "asc",
    },
  });
  if (dialog.task == "rename") {
    return await systemRename(conversation, dialog, chatMessages);
  } else if (dialog.task == "add-agent") {
    return await systemAddAgent(conversation, dialog, chatMessages);
  }
}

function extractCommandArgument(input: string, command: string): string | null {
  const parts = input.split(" ");
  if (parts.length > 1 && parts[0] === command) {
    return parts.slice(1).join(" "); // Join the remaining parts to get the full argument
  }
  return null;
}

async function systemRename(
  conversation: ConversationFull,
  subDialog: SubDialog,
  chatMessages: ChatMessage[]
) {
  if (chatMessages.length === 0) {
    throw Error("Should be at least one message in dialog.");
  } else if (chatMessages.length === 1) {
    const argument = extractCommandArgument(chatMessages[0].content, "/rename");
    if (argument) {
      return { type: "rename", content: argument };
    } else {
      const title = await suggestTitle(conversation.chatMessages)
      return { type: "system", content: `how about this title? {title}` };
    }
  } else {

    await suggestTitle(conversation.chatMessages);
  }
}

async function suggestTitle(chatMessages: ChatMessage[], hint?: string) {
  const messages = truncateChatMessages(
    chatMessages.filter(
      (value) =>
        (value.sender === "main" || value.sender === "user") &&
        !value.subDialogId
    ),
    10000
  ).join("\n");
  const question = `Please give a title to the following conversation. ${hint||""} Do not include any additional comments. : 
${messages}`;
  const answer = await simpleTalk("llama3-8b-8192-basic", question);
  const title = normalizeString(answer);
}

async function renameAgentRouter(chatMessages: ChatMessage[], hint?: string) {
  const messages = truncateChatMessages(chatMessages, 10000).join("\n");
  const question = `You are a conversation manager agent. The user wants to rename the title of a conversation. You cannot see the conversation yet. Here is the dialog with the user and you:

------DIALOG BEGIN------
${messages}
------DIALOG END------
  
If the user does not say yes, it means no. Then follow the user's instruction.
  
Question: What should you do next? Please only give a JSON to answer this.
  {"action": "Read the conversation and suggest a title."}
  {"action": "Rename the title", "title": ?}
`;
  const answerText = await simpleTalk("llama3-8b-8192-basic", question);
  const answer = JSON.parse(answerText);
  return answer
}

async function systemAddAgent(
  conversation: ConversationFull,
  subDialog: SubDialog,
  chatMessages: ChatMessage[]
) {}
