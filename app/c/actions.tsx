"use server";
import Groq from "groq-sdk";
import { HttpsProxyAgent } from "https-proxy-agent";
import "dotenv/config";

type Chat = {
  question: string;
  answer: string;
};

const groq = new Groq({
  apiKey: process.env["GROQ_KEY"],
  httpAgent: new HttpsProxyAgent("http://127.0.0.1:7890"),
});

export async function llm(text: string, chats: Chat[] | undefined, system: string | undefined) {
  console.log("question", text);
  const messages = chats
    ? chats
        .map(({ question, answer }) => [
          { role: "user", content: question },
          { role: "assistant", content: answer },
        ])
        .flat()
    : [];
  messages.push({
    role: "user",
    content: text,
  })
  const chatCompletion = await groq.chat.completions.create({
    messages,
    model: "llama3-8b-8192",
    temperature: 0,
    max_tokens: 500,
    top_p: 1,
  });
  console.log("question returned");
  return chatCompletion.choices[0]?.message?.content || "";
}
