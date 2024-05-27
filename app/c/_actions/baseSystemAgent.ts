import { ConversationFull, Order } from "@/lib/types";
import { prisma } from "@/lib/db";
import { SubDialog, ChatMessage } from "@prisma/client";

export class BaseSystemAgent {
  conversation: ConversationFull;
  dialog: SubDialog;
  messageCallback: (message: ChatMessage) => void;
  orderCallback: (order: Order) => void;

  constructor(
    conversation: ConversationFull,
    dialog: SubDialog,
    messageCallback: (message: ChatMessage) => void,
    orderCallback: (order: Order) => void
  ) {
    this.conversation = conversation;
    this.dialog = dialog;
    this.messageCallback = messageCallback;
    this.orderCallback = orderCallback;
  }

  async orderThencloseDialog(order: Order) {
    this.orderCallback(order);
    await prisma.subDialog.update({
      where: { id: this.dialog.id },
      data: { status: "CLOSE" },
    });
    this.orderCallback({ type: "close-dialog", content: "" });
  }

  async message(content: string) {
    const message = await prisma.chatMessage.create({
      data: {
        sender: "system",
        content,
        conversationId: this.conversation.id,
        subDialogId: this.dialog.id,
      },
    });
    this.messageCallback(message);
  }

  async init() {

  }
  async act() {
    
  }
}
