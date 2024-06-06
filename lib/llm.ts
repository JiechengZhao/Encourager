import Groq from "groq-sdk";
import { HttpsProxyAgent } from "https-proxy-agent";
import "dotenv/config";
import { BadRequestError } from "groq-sdk/error";
import { sprintf } from "sprintf-js";
import { prisma } from "@/lib/db";
import { Dialog, QuestionAnswer } from "@/lib/types";
import { Bot } from "./types";
const groq = new Groq({
  apiKey: process.env["GROQ_KEY"],
  httpAgent: new HttpsProxyAgent("http://127.0.0.1:7890"),
});

export async function getDialogWithLastKQA(dialogId: number, k: number) {
  return await prisma.lLMDialog.findUnique({
    where: {
      id: dialogId,
    },
    include: {
      questionAnswer: {
        orderBy: {
          createdAt: "desc",
        },
        take: k,
      },
    },
  });
}

export async function saveQuestionAndAnswer(
  lLMDialogId: number,
  question: string,
  answer: string
) {
  return await prisma.questionAnswer.create({
    data: {
      question,
      answer,
      lLMDialogId,
    },
  });
}

export async function saveDialog(
  conversationId: number,
  bot: string,
  system: string
) {
  return await prisma.lLMDialog.create({
    data: {
      system,
      bot,
      conversationId,
    },
  });
}

function truncateChatsToMaxLength(
  conversations: QuestionAnswer[],
  limit: number
): QuestionAnswer[] {
  let k = 0;
  const res: QuestionAnswer[] = [];

  for (const item of conversations.reverse()) {
    const totalLength = item.answer.length + item.question.length;
    if (k + totalLength <= limit) {
      res.push(item);
      k += totalLength;
    } else {
      break; // Stop adding items once the limit is exceeded
    }
  }

  return res.reverse();
}

function getMessages(text: string, limit: number, dialog: Dialog) {
  let messages = [];
  if (dialog.system.length > 0) {
    messages.push({
      role: "system",
      content: dialog.system,
    });
  }
  if (dialog.mode.includes("use history")) {
    const chatsMessage = truncateChatsToMaxLength(
      dialog.questionAnswer,
      limit - text.length - dialog.system.length
    )
      .map(({ question, answer }) => [
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ])
      .flat();

    messages = [...messages, ...chatsMessage];
  }
  messages.push({
    role: "user",
    content: text,
  });
  return messages;
}

const bots: Record<string, Bot> = {
  "llama3-8b-8192-basic": {
    call: async (messages) => {
      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "llama3-8b-8192",
        temperature: 0,
        max_tokens: 8192,
        top_p: 1,
      });
      return chatCompletion.choices[0]?.message?.content;
    },
    smartLimitation: 60000,
    MAX_TRY_NUM: 10,
  },
};

export async function simpleTalk(
  botName: string,
  text: string,
  system?: string
) {
  if (bots[botName]) {
    const bot = bots[botName];
    const messages = [];
    if (system) {
      messages.push({
        role: "system",
        content: system,
      });
    }
    messages.push({ role: "user", content: text });
    const answer = await bot.call(messages);
    await prisma.simpleTalk.create({
      data: {
        botName,
        question: text,
        answer,
        system,
      },
    });
    return answer
  } else {
    throw new Error("No such bot");
  }
}

export async function dialogTalk(text: string, dialogId: number) {
  const dialog = await getDialogWithLastKQA(dialogId, 1000);
  if (!dialog) {
    throw new Error("Error: Invalid dialog Id");
  }
  if (dialog.template) {
    text = sprintf(dialog.template, text);
  }
  const bot = bots[dialog.bot];
  let limit = bot.smartLimitation;

  for (let i = 0; i < bot.MAX_TRY_NUM; i++) {
    let messages;
    messages = getMessages(text, limit, dialog);

    try {
      const answer = await bot.call(messages);
      if (JSON.stringify(messages).length > bot.smartLimitation * 0.9) {
        bot.smartLimitation = bot.smartLimitation * 1.01;
      }
      if (answer) {
        await saveQuestionAndAnswer(dialogId, text, answer);
        return answer;
      } else {
        throw new Error("No answer");
      }
    } catch (error) {
      if (error instanceof BadRequestError) {
        const errDetails = error.error as Record<string, any>;
        if (
          errDetails &&
          errDetails.error &&
          errDetails.error.code === "context_length_exceeded"
        ) {
          if (messages.length <= 2) {
            throw new Error;
          }
          console.error(
            "Enconter context_length_exceeded, adjust truncate setting and retry."
          );
          console.error(
            `Current limit ${limit}, Current global limit ${bot.smartLimitation}`
          );
          console.error(`Groq: BadRequestError: ${JSON.stringify(errDetails)}`);
          limit = limit * 0.7;
          bot.smartLimitation = bot.smartLimitation * 0.95;
          continue;
        }
      }
      throw new Error;
    }
  }
  throw new Error("Error: Maximum retry attempts exceeded for calling llm.");
}
