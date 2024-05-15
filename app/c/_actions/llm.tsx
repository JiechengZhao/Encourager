"use server";
import Groq from "groq-sdk";
import { HttpsProxyAgent } from "https-proxy-agent";
import "dotenv/config";
import internal from "stream";
import { BadRequestError, APIError } from "groq-sdk/error";

type Chat = {
  question: string;
  answer: string;
};

const groq = new Groq({
  apiKey: process.env["GROQ_KEY"],
  httpAgent: new HttpsProxyAgent("http://127.0.0.1:7890"),
});

function truncateChatsToMaxLength(chats: Chat[], limit: number): Chat[] {
  let k = 0;
  const res: Chat[] = [];

  for (const item of chats.reverse()) {
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

function calculateTotalChatLength(chats: Chat[]): number {
  return chats.reduce(
    (total, chat) => total + chat.question.length + chat.answer.length,
    0
  );
}

const max_tokens = 8192;
let smartLimitation = max_tokens * 7;
const MAX_TRY_NUM = 10;

function getMessages(
  text: string,
  limit: number,
  chats: Chat[] | undefined,
  system: string | undefined
) {
  let messages = [];
  if (system) {
    messages.push({
      role: "system",
      content: system,
    });
  }
  if (chats) {
    const chatsMessage = truncateChatsToMaxLength(
      chats,
      limit - text.length - (system?.length || 0)
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

export async function llm(text: string, chats?: Chat[], system?: string) {
  let limit = smartLimitation;
  for (let i = 0; i < MAX_TRY_NUM; i++) {
    const messages = getMessages(text, limit, chats, system);
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "llama3-8b-8192",
        temperature: 0,
        max_tokens,
        top_p: 1,
      });
      if (JSON.stringify(messages).length > smartLimitation * 0.9) {
        smartLimitation = smartLimitation * 1.01;
      }
      return chatCompletion.choices[0]?.message?.content || "";
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
  throw Error("Error: Maximum retry attempts exceeded for calling llm.")
}
