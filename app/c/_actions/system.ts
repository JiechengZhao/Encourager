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
      orderCallback({ type: "open-dialog", content: dialog.id });
    } else if (chat.content.startsWith("/add-agent")) {
      dialog = await prisma.subDialog.create({
        data: {
          conversationId: conversation.id,
          task: "add-agent",
          status: "OPEN",
        },
      });
      orderCallback({ type: "open-dialog", content: dialog.id });
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
      subDialogId: dialog.id,
    },
    orderBy: {
      id: "asc",
    },
  });
  if (dialog.task == "rename") {
    const renameRes = await systemRename(conversation, dialog, chatMessages);
    if (renameRes.type === "system-message") {
      const message = await prisma.chatMessage.create({
        data: {
          sender: "system",
          content: renameRes.content,
          conversationId: conversation.id,
          subDialogId: dialog.id,
        },
      });
      messageCallback(message);
    } else {
      orderCallback(renameRes);
      await prisma.subDialog.update({
        where: {
          id: subDialogId,
        },
        data: {
          status: "CLOSE",
        },
      });
      orderCallback({ type: "close-dialog", content: "" });
    }
    return;
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
      const title = await suggestTitle(conversation.chatMessages);
      await prisma.subDialog.update({
        where: {
          id: subDialog.id,
        },
        data: {
          payload: JSON.stringify({
            title: title.title,
            ...JSON.parse(subDialog.payload || "{}"),
          }),
        },
      });
      return {
        type: "system-message",
        content: `The conversation will be renamed to "${title.title}", is that OK? Answer Yes or No, if no please give a hint or suggest another name.`,
      };
    }
  } else {
    const instruction = await renameAgentRouter(chatMessages);
    if (instruction?.action === "Rename the title") {
      return { type: "rename-title", content: instruction?.title };
    } else {
      const title = await suggestTitle(conversation.chatMessages, chatMessages);
      return {
        type: "system-message",
        content: `The conversation will be renamed to "${title.title}", is that OK? Answer Yes or No, if no please give a hint or suggest another name.`,
      };
    }
  }
}

async function suggestTitle(
  chatMessages: ChatMessage[],
  dialogMessages?: ChatMessage[]
) {
  const chat = truncateChatMessages(
    chatMessages.filter(
      (value) =>
        (value.sender === "main" || value.sender === "user") &&
        !value.subDialogId
    ),
    10000
  ).join("\n");
  let dialog = "";
  if (dialogMessages) {
    const dialogText = truncateChatMessages(dialogMessages, 1000).join("\n");
    dialog = `Here is your dialog with user.
------DIALOG BEGIN------
${dialogText}
------DIALOG BEGIN------

`;
  }
  const question = `You are a conversation manager agent. The user wants to rename the title of a conversation. 

${dialog}
Here is user's conversation.
------CONVERSATION BEGIN------
${chat}
------CONVERSATION END------

Question: What is a good title for this conversation? Please give a JSON only answer, do not add other content.
  {"title":?}
`;
  const answerText = await simpleTalk("llama3-8b-8192-basic", question);

  return JSON.parse(answerText);
}

async function renameAgentRouter(chatMessages: ChatMessage[]) {
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
  return answer;
}

const agentSet = new Set(["revisor"]);

async function systemAddAgent(
  conversation: ConversationFull,
  subDialog: SubDialog,
  chatMessages: ChatMessage[]
) {
  if (chatMessages.length === 0) {
    throw Error("Should be at least one message in dialog.");
  } else if (chatMessages.length === 1) {
    const argument = extractCommandArgument(
      chatMessages[0].content,
      "/add-agent"
    );
    if (argument && agentSet.has(argument)) {
      return { type: "add-agent", content: argument };
    } else {
      return {
        type: "system-message",
        content: `Please select agent ${agentSet}`,
      };
    }
  }
}
