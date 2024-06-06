import { ConversationFull, Order } from "@/lib/types";
import { SubDialog, ChatMessage } from "@prisma/client";
import { extractCommandArgument } from "@/lib/tools";
import { prisma, getChatMessagesOfDialog } from "@/lib/db";
import { BaseSystemAgent } from "./baseSystemAgent";

const agentSet = new Set(["revisor"]);

export class AddAgentAgent extends BaseSystemAgent {
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
        "/add-agent"
      );
      if (argument && agentSet.has(argument)) {
        this.orderThencloseDialog({ type: "add-agent", content: argument });
        return;
      } else {
        this.message(`Please select agent ${agentSet}`);
        return;
      }
    }
  }
}
