import { simpleTalk } from "@/lib/llm";
import { Order } from "@/lib/types";
import { ChatMessage } from "@prisma/client";
import { sprintf } from "sprintf-js";

const promptTemplate = `Please revise the following text and provide only the revised text. Do not include any additional comments. If there is nothing to revise, just respond with "No changes needed."
Please revise:

%s.`;

async function wordRevise(
  chat: ChatMessage,
  orderCallback: (order: Order) => void
) {
  const answer = await simpleTalk(
    "llama3-8b-8192-basic",
    sprintf(promptTemplate, chat.content)
  );
  orderCallback({ type: "revise", content: answer });
}

export default wordRevise;
