import { ChatMessage, Task } from "@prisma/client";
import { ContainId, TaskAIResponse, TaskRecord } from "./types";
import {WError} from "verror";

export function extractCommandArgument(
  input: string,
  command: string
): string | null {
  const parts = input.split(" ");
  if (parts.length > 1 && parts[0] === command) {
    return parts.slice(1).join(" "); // Join the remaining parts to get the full argument
  }
  return null;
}
export function truncateChatMessages(
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

export function listToReco<T extends string | number | symbol>(
  curr: ContainId<T>[]
): Record<T, ContainId<T>> {
  return curr.reduce((p, t) => {
    return { [t.id]: t, ...p };
  }, {});
}
export function getAllTasksFromSubtaskRecords(
  subtasks: Record<number, Task[]>,
  init: TaskRecord
): TaskRecord {
  return Object.entries(subtasks).reduce((prev, [_, curr]) => {
    return { ...prev, ...listToReco(curr) };
  }, init);
}

export function extractJson(response: string): any {
  const jsonPattern = /({[^]*}|\[[^]*\])\s*$/;
  const match = response.match(jsonPattern);

  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (error) {
      throw new WError("Failed to parse JSON:", error);
    }
  } else {
    throw new Error("No JSON found in the response");
  }
}