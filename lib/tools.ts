import { ChatMessage } from "@prisma/client";

export function extractCommandArgument(input: string, command: string): string | null {
  const parts = input.split(" ");
  if (parts.length > 1 && parts[0] === command) {
    return parts.slice(1).join(" "); // Join the remaining parts to get the full argument
  }
  return null;
}export function truncateChatMessages(
  messages: ChatMessage[],
  limit: number
): string[] {
  let k = 0;
  const res: string[] = [];

  for (const item of messages.reverse()) {
    const s = `${item.sender}: ${item.content}`;
    if (k + s.length <= limit) {
      res.push(s);
      k += s.length;
    } else {
      break; // Stop adding items once the limit is exceeded
    }
  }

  return res.reverse();
}

