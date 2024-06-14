import { dialogTalk, simpleTalk, BASIC_BOT_NAME } from "@/lib/llm";
import { extractJson } from "@/lib/tools";
import { Order } from "@/lib/types";
import { ChatMessage } from "@prisma/client";
import { sprintf } from "sprintf-js";

const AgentList : Record<string, string> = {
  "Rename the conversation": "rename",
  "change the system settings": "add-agent",
  "Add some new tasks": "task",
  "Add/change a time estimation to a task": "task",
  "Change the current task hierarchy": "task",
  "Schedule the task": "task",
  "Discuss something": "main",
  "Design something": "main",
  "Plan something": "task",
  "Not any task of the above, just a part of normal conversation": "main"
};

const promptTemplatePart = Object.keys(AgentList).reduce((prev, curr)=> `${prev}\n  "${curr}":?,`, "")

const promptTemplate = `Here are some words from the user:

-----------
%s
-----------

What does he want to do? Fill in the following JSON to answer it. The key represents an action he might want to take, and the value should be a number from 0 to 10 to indicate how likely he is to want to do it. 0 means he does not want to do it, and 10 means he definitely wants to do it.

{${promptTemplatePart}
}
Please give the JSON only.
`;

async function agentRouter(chat: ChatMessage) {
  const answer = await simpleTalk(
    BASIC_BOT_NAME,
    sprintf(promptTemplate, chat.content)
  );
  const res = extractJson(answer);
  
  const largestKey = Object.keys(res).reduce((a, b) => res[a] >= res[b] ? a : b);
  return AgentList[largestKey]
}

export default agentRouter;
