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

function getMessages(
  text: string,
  limit: number,
  questionAnswer: QuestionAnswer[],
  system: string,
  template: string | null
) {
  let messages = [];
  if (system && system.length > 0) {
    messages.push({
      role: "system",
      content: system,
    });
  }
  const chatsMessage = truncateChatsToMaxLength(
    questionAnswer,
    limit - text.length - system.length
  )
    .map(({ question, answer }) => [
      { role: "user", content: question },
      { role: "assistant", content: answer },
    ])
    .flat();

  messages = [...messages, ...chatsMessage];
  messages.push({
    role: "user",
    content: template ? sprintf(template, text) : text,
  });
  return messages;
}

export const BASIC_BOT_NAME = "llama3-8b-8192-basic";

const bots: Record<string, Bot> = {
  [BASIC_BOT_NAME]: {
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
    return answer;
  } else {
    throw new Error("No such bot");
  }
}

export async function dialogTalk(text: string, dialogId: number) {
  const dialog = await getDialogWithLastKQA(dialogId, 1000);
  if (!dialog) {
    throw new Error("Error: Invalid dialog Id");
  }
  return await dialogTalkInner(text, dialog);
}

export async function dialogTalkInner(
  text: string,
  dialog: {
    questionAnswer: QuestionAnswer[];
    id?: number;
    system: string | null | undefined;
    template: string | null | undefined;
    bot: string;
  }
) {
  const bot = bots[dialog.bot];
  let limit = bot.smartLimitation;

  for (let i = 0; i < bot.MAX_TRY_NUM; i++) {
    let messages;
    messages = getMessages(
      text,
      limit,
      dialog.questionAnswer,
      dialog.system || "",
      dialog.template || null
    );

    try {
      const answer = await bot.call(messages);
      if (JSON.stringify(messages).length > bot.smartLimitation * 0.9) {
        bot.smartLimitation = bot.smartLimitation * 1.01;
      }
      if (answer) {
        if (dialog.id) {
          await saveQuestionAndAnswer(dialog.id, text, answer);
        }
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
            throw new Error();
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
      throw new Error();
    }
  }
  throw new Error("Error: Maximum retry attempts exceeded for calling llm.");
}
