import { ConversationFull, Order } from "@/lib/types";
import { simpleTalk } from "@/lib/llm";
import { prisma } from "@/lib/db";
import { SubDialog, ChatMessage } from "@prisma/client";
import { extractCommandArgument } from "@/lib/tools";
import { truncateChatMessages } from "@/lib/tools";
import { BaseSystemAgent } from "./baseSystemAgent";

export class RenameAgent extends BaseSystemAgent {
  constructor(
    conversation: ConversationFull,
    dialog: SubDialog,
    messageCallback: (message: ChatMessage) => void,
    orderCallback: (order: Order) => void
  ) {
    super(conversation, dialog, messageCallback, orderCallback);
  }

  private async updateTitle(title: string) {
    await prisma.subDialog.update({
      where: { id: this.dialog.id },
      data: {
        payload: JSON.stringify({
          title: title,
          ...JSON.parse(this.dialog.payload || "{}"),
        }),
      },
    });
  }

  async act() {
    if (this.chatMessages.length === 0) {
      throw new Error("Should be at least one message in dialog.");
    }

    if (this.chatMessages.length === 1) {
      const argument = extractCommandArgument(
        this.chatMessages[0].content,
        "/rename"
      );
      if (argument) {
        await prisma.conversation.update({
          where: { id: this.conversation.id },
          data: { title: argument },
        });
        await this.orderThencloseDialog({
          type: "rename-title",
          content: argument,
        });
        return;
      } else {
        const title = await this.suggestTitle();
        await this.updateTitle(title.title);
        await this.message(
          `The conversation will be renamed to "${title.title}", is that OK? Answer Yes or No, if no please give a hint or suggest another name.`
        );
        return;
      }
    } else {
      const instruction = await this.renameAgentRouter(this.chatMessages);
      const title = JSON.parse(this.dialog.payload || "")?.title;
      if (instruction?.action === "Rename the title" && title) {
        await prisma.conversation.update({
          where: { id: this.conversation.id },
          data: { title: title },
        });
        await this.orderThencloseDialog({
          type: "rename-title",
          content: title,
        });
        return;
      } else {
        const title = await this.suggestTitle(this.chatMessages);
        await this.message(
          `The conversation will be renamed to "${title.title}", is that OK? Answer Yes or No, if no please give a hint or suggest another name.`
        );
        return;
      }
    }
  }

  private async suggestTitle(dialogMessages?: ChatMessage[]) {
    const chat = truncateChatMessages(
      this.conversation.chatMessages.filter(
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

  private async renameAgentRouter(chatMessages: ChatMessage[]) {
    const messages = truncateChatMessages(chatMessages, 10000).join("\n");
    const question = `You are a conversation manager agent. The user wants to rename the title of a conversation. You cannot see the conversation yet. Here is the dialog with the user and you:

------DIALOG BEGIN------
${messages}
------DIALOG END------
  
If the user does not say yes, it means no. Then follow the user's instruction.
  
Question: What should you do next? Please only give a JSON to answer this.
  {"action": "Read the conversation and suggest a title."}
  {"action": "Rename the title"}
`;
    const answerText = await simpleTalk("llama3-8b-8192-basic", question);
    return JSON.parse(answerText);
  }
}
