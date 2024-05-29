import { PrismaClient, Prisma, Task } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { TaskFull } from "./types";

export const prisma = new PrismaClient().$extends(withAccelerate());

export async function getSettings(): Promise<Prisma.SettingsGetPayload<{}>> {
  const settings = await prisma.settings.findFirst({
    cacheStrategy: { swr: 60, ttl: 60 },
  });
  if (!settings) {
    throw Error("No system settings. Please init the system first.");
  }
  return settings;
}

export async function setSettings(data: Prisma.SettingsUpdateInput) {
  // Update the settings in the database
  const updatedSettings = await prisma.settings.update({
    where: { id: 1 }, // Assuming there's only one row in the settings table
    data,
  });

  return updatedSettings;
}

export async function getChatMessagesOfDialog(dialog: {
  id: number;
  conversationId: number;
  task: string;
  payload: string | null;
  status: string;
  createdAt: Date;
}) {
  return await prisma.chatMessage.findMany({
    where: {
      subDialogId: dialog.id,
    },
    orderBy: {
      id: "asc",
    },
  });
}

async function getParents(
  taskId: number,
  visited: Set<number> = new Set()
): Promise<TaskFull> {
  if (visited.has(taskId)) {
    throw new Error("Circular reference detected.");
  }
  visited.add(taskId);

  const task = await prisma.task.findUnique({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { id: taskId },
  });
  if (task) {
    if (task.parentId) {
      const parent = await getParents(task.parentId, visited);
      const taskFinal = {
        ...task,
        parent,
        subtasks: undefined,
      };
      taskFinal.parent.subtasks = taskFinal;
      return taskFinal;
    }

    return {
      ...task,
      parent: undefined,
      subtasks: undefined,
    };
  }
  throw new Error("can not find the task");
}

async function getSubtasks(
  task: Task,
  generation: number
): Promise<TaskFull[] | undefined> {
  if (generation <= 0) {
    return undefined;
  }
  const subtasks = await prisma.task.findMany({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { parentId: task.id },
  });

  const subtasksFull = await Promise.all(
    subtasks.map(async (subtask) => {
      const taskFinal = {
        ...subtask,
        subtasks: await getSubtasks(subtask, generation - 1),
        parent: undefined,
      };
      if (taskFinal.subtasks) {
        taskFinal.subtasks = taskFinal.subtasks.map((task) => ({
          ...task,
          parent: taskFinal,
        }));
      }
      return taskFinal;
    })
  );
  return subtasksFull;
}

export async function getTask(
  taskId: number,
  generation: number
): Promise<TaskFull | undefined> {
  const task = await prisma.task.findUnique({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { id: taskId },
  });
  if (task) {
    const taskFinal = {
      ...task,
      subtasks: await getSubtasks(task, generation),
      parent: task.parentId
        ? await getParents(task.parentId, new Set())
        : undefined,
    };
    if (taskFinal.parent) {
      taskFinal.parent.subtasks = taskFinal;
    }
    if (taskFinal.subtasks) {
      taskFinal.subtasks = taskFinal.subtasks.map((task) => ({
        ...task,
        parent: taskFinal,
      }));
    }
    return taskFinal;
  } else {
    throw Error(`can not find the task id: ${taskId}`);
  }
}
