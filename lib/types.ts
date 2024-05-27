import { Prisma, Task } from "@prisma/client";

export const conversationShortSelect = {
  id: true,
  title: true,
  description: true,
  updatedAt: true,
};

export type ConversationShort = Prisma.ConversationGetPayload<{
  select: typeof conversationShortSelect;
}>;

export const conversationFullInclude = {
  dialogs: true,
  chatMessages: true,
};

export type ConversationFull = Prisma.ConversationGetPayload<{
  include: typeof conversationFullInclude;
}>;

export type Dialog = Prisma.LLMDialogGetPayload<{
  include: {
    questionAnswer: true;
  };
}>;

export type TaskFull = {
  subtasks: TaskFull[];
  parent: TaskFull | undefined;
} & Task;

export type QuestionAnswer = {
  question: string;
  answer: string;
};

export type Message = {
  role: string;
  content: string;
};
export type Bot = {
  call: (messages: Message[]) => Promise<string>;
  smartLimitation: number;
  MAX_TRY_NUM: number;
};

export type Order = {
  type: string;
  content: any;
};
