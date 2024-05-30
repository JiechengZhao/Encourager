import { PrismaClient, Prisma, Task } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { TasksPack, TaskRecord } from "./types";
import { listToReco } from "./tools";
import { getAllTasksFromSubtaskRecords } from "./tools";

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

export async function getParents(
  taskId: number,
  visited: Set<number> = new Set(),
  containSubtasks: boolean = true
): Promise<TasksPack> {
  if (visited.has(taskId)) {
    throw new Error("Circular reference detected.");
  }
  visited.add(taskId);

  const task = await prisma.task.findUnique({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { id: taskId },
    include: {
      subtasks: true,
    },
  });
  if (task) {
    const tasks = {
      [task.id]: { ...task, subtasks: task.subtasks.map((t) => t.id) },
      ...listToReco(task.subtasks),
    };

    if (task.parentId) {
      const parent = await getParents(task.parentId, visited, containSubtasks);
      return {
        tasks: { ...parent.tasks, ...tasks },
        current: task.id,
        root: parent.root,
      };
    } else {
      return {
        tasks,
        current: task.id,
        root: task.id,
      };
    }
  }
  throw new Error("can not find the task");
}

export async function getSubtasks(
  taskId: number,
  generation: number
): Promise<Record<number, Task[]>> {
  const subtasks = await prisma.task.findMany({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { parentId: taskId },
  });
  const newGeneration = generation - 1;
  if (newGeneration <= 0) {
    return { [taskId]: subtasks };
  }
  const more = (
    await Promise.all(
      subtasks.map(
        async (subtask) => await getSubtasks(subtask.id, newGeneration)
      )
    )
  ).reduce((prev, curr) => {
    return { ...prev, ...curr };
  }, {});
  return { ...more, [taskId]: subtasks };
}

export async function getTask(
  taskId: number,
  generation: number
): Promise<TasksPack> {
  const task = await prisma.task.findUnique({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { id: taskId },
  });
  if (task) {
    const subtasks = await getSubtasks(task.id, generation);
    const tasks: TaskRecord = getAllTasksFromSubtaskRecords(subtasks, {
      [task.id]: task,
    });
    for (const key of Object.keys(subtasks)) {
      const id = Number(key);
      tasks[id] = { ...tasks[id], subtasks: subtasks[id].map((t) => t.id) };
    }
    if (task.parentId) {
      const parent = await getParents(task?.parentId);
      return {
        tasks: { ...parent.tasks, ...tasks },
        root: parent.root,
        current: task.id,
      };
    } else {
      return {
        tasks,
        root: task.id,
        current: task.id,
      };
    }
  } else {
    throw Error(`can not find the task id: ${taskId}`);
  }
}

export async function newTask(
  name: string,
  subDialogId: number,
  description?: string,
  parentId?: number
) {
  const task = await prisma.task.create({
    data: {
      name,
      description,
      subDialogId,
      parentId,
    },
  });
  return task;
}

export async function liftTask(taskId: number) {
  const task = await prisma.task.findUniqueOrThrow({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: {
      id: taskId,
    },
    include: {
      parent: true,
    },
  });
  if (task.parent) {
    await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        parentId: task.parent.parentId,
      },
    });
  } else {
    throw Error("Can not lift the task, Already the top level.");
  }
}

export async function lowerTask(taskId: number, newParentId: number) {
  const tasks = await prisma.task.findMany({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: {
      OR: [{ id: taskId }, { id: newParentId }],
    },
  });

  const task = tasks.find((t) => t.id === taskId);
  const newParent = tasks.find((t) => t.id === newParentId);

  if (task && newParent && task.parentId !== newParent.parentId) {
    throw Error(
      "invalid lower the new parent must be the sister task of the current task"
    );
  }

  await prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      parentId: newParentId,
    },
  });
}
