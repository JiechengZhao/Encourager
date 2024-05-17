"use server";
import Groq from "groq-sdk";
import { HttpsProxyAgent } from "https-proxy-agent";
import "dotenv/config";
import { BadRequestError, APIError } from "groq-sdk/error";
import { PrismaClient, Prisma } from "@prisma/client";
import NodeCache from "node-cache";
import { sprintf } from "sprintf-js";

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const prisma = new PrismaClient();

const groq = new Groq({
  apiKey: process.env["GROQ_KEY"],
  httpAgent: new HttpsProxyAgent("http://127.0.0.1:7890"),
});

export type Dialog = Prisma.LLMDialogGetPayload<{
  include: {
    questionAnswer: true;
  };
}>;

export type QuestionAnswer = {
  question: string;
  answer: string;
};

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

const max_tokens = 8192;
let smartLimitation = max_tokens * 7;
const MAX_TRY_NUM = 10;

function getMessages(text: string, limit: number, dialog: Dialog) {
  let messages = [];
  if (dialog.system.length > 0) {
    messages.push({
      role: "system",
      content: dialog.system,
    });
  }
  if (dialog.mode === "use history") {
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

const bots: Record<
  string,
  (
    messages: Groq.Chat.Completions.CompletionCreateParams.Message[]
  ) => Promise<Groq.Chat.Completions.ChatCompletion>
> = {
  "llama3-8b-8192-basic": async (messages) => {
    return groq.chat.completions.create({
      messages,
      model: "llama3-8b-8192",
      temperature: 0,
      max_tokens,
      top_p: 1,
    });
  },
};

export async function llm(text: string, dialogId: number) {
  const dialog = await getDialogWithLastKQA(dialogId, 1000);
  if (!dialog) {
    throw Error("Error: Invalid dialog Id");
  }
  let limit = smartLimitation;
  if (dialog.template) {
    text = sprintf(dialog.template, text);
    console.log(text);
  }
  for (let i = 0; i < MAX_TRY_NUM; i++) {
    let messages;
    messages = getMessages(text, limit, dialog);

    try {
      const chatCompletion = await bots[dialog.bot](messages);
      if (JSON.stringify(messages).length > smartLimitation * 0.9) {
        smartLimitation = smartLimitation * 1.01;
      }
      const answer = chatCompletion.choices[0]?.message?.content;
      if (answer) {
        await saveQuestionAndAnswer(dialogId, text, answer);
        return answer;
      } else {
        throw Error("No answer");
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
            throw error;
          }
          console.error(
            "Enconter context_length_exceeded, adjust truncate setting and retry."
          );
          console.error(
            `Current limit ${limit}, Current global limit ${smartLimitation}`
          );
          console.error(`Groq: BadRequestError: ${JSON.stringify(errDetails)}`);
          limit = limit * 0.7;
          smartLimitation = smartLimitation * 0.95;
          continue;
        }
      }
      throw error;
    }
  }
  throw Error("Error: Maximum retry attempts exceeded for calling llm.");
}
