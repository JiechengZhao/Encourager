import { ConversationFull, Order, TaskAIResponse } from "@/lib/types";
import { simpleTalk } from "@/lib/llm";
import { prisma, getChatMessagesOfDialog } from "@/lib/db";
import { SubDialog, ChatMessage } from "@prisma/client";
import { extractCommandArgument, extractJson } from "@/lib/tools";
import { truncateChatMessages } from "@/lib/tools";
import { BaseSystemAgent } from "./baseSystemAgent";

export class TaskManager extends BaseSystemAgent {
  constructor(
    conversation: ConversationFull,
    dialog: SubDialog,
    messageCallback: (message: ChatMessage) => void,
    orderCallback: (order: Order) => void
  ) {
    super(conversation, dialog, messageCallback, orderCallback);
  }

  async act() {
    if (this.chatMessages.length === 0) {
      throw new Error("Should be at least one message in dialog.");
    }

    if (this.chatMessages.length === 1) {
      const argument = extractCommandArgument(
        this.chatMessages[0].content,
        "/task"
      );
      if (argument) {
        return;
      } else {
        const tasks = await this.suggestTask();
        await this.message(tasksToMarkdown(tasks));
        return;
      }
    } else {
      const tasks = await this.continueTalk();
      await this.message(tasks);
      return;

    }
  }

  private async suggestTask(useDialog: boolean = true) {
    const chat = truncateChatMessages(
      this.conversation.chatMessages.filter(
        (value) =>
          (value.sender === "main" || value.sender === "user") &&
          !value.subDialogId
      ),
      10000
    ).join("\n");

    let dialog = "";
    if (useDialog) {
      const dialogText = truncateChatMessages(this.chatMessages, 1000).join(
        "\n"
      );
      dialog = `Here is your dialog with user.
------DIALOG BEGIN------
${dialogText}
------DIALOG BEGIN------

`;
    }

    const question = `You are a conversation manager agent. The user wants to make a TODO list from the conversation. 

Here is user's conversation.
------CONVERSATION BEGIN------
${chat}
------CONVERSATION END------

${dialog}
Find the most top task in the conversation and also give its subtasks.

Make a TODO list for user. Return it in JSON and. give the JSON only. Here is the format:
[{
"id" : someid
"name": "taskName",
"estimate_time": "?-?",
"parentId" : parent-task-id
"dependency": [dependency-task-ids]
}, ...]

`;
    const answerText = await simpleTalk("llama3-8b-8192-basic", question);
    return extractJson(answerText) as TaskAIResponse[];
  }

  private async continueTalk(useDialog: boolean = true) {
    const chat = truncateChatMessages(
      this.conversation.chatMessages.filter(
        (value) =>
          (value.sender === "main" || value.sender === "user") &&
          !value.subDialogId
      ),
      10000
    ).join("\n");

    let dialog = "";
    if (useDialog) {
      const dialogText = truncateChatMessages(this.chatMessages, 1000).join(
        "\n"
      );
      dialog = `Here is your dialog with user.
------DIALOG BEGIN------
${dialogText}
------DIALOG BEGIN------

`;
    }

    const question = `You are a conversation manager agent. The user wants to make a TODO list from the conversation. 

Here is user's conversation.
------CONVERSATION BEGIN------
${chat}
------CONVERSATION END------

${dialog}
Answer user's last question.
`;
    const answerText = await simpleTalk("llama3-8b-8192-basic", question);
    return answerText;
  }
}

function tasksToMarkdown(tasks: TaskAIResponse[]): string {
  let markdown = "# Task List\n\n";

  tasks.forEach((task) => {
    markdown += `## Task ${task.id}: ${task.name}\n`;
    markdown += `**Estimate Time:** ${task.estimate_time}\n`;
    if (task.parentId) {
      markdown += `**Parent ID:** ${task.parentId}\n`;
    }
    if (task.dependency && task.dependency.length > 0) {
      markdown += `**Dependencies:** ${
        task.dependency.length > 0 ? task.dependency.join(", ") : "None"
      }\n\n`;
    }
  });

  return markdown;
}
