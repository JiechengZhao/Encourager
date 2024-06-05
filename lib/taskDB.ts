import { Task } from "@prisma/client";
import { TasksPack, TaskRecord } from "./types";
import { listToReco } from "./tools";
import { getAllTasksFromSubtaskRecords } from "./tools";
import { prisma } from "./db";
import { Set } from "immutable";
import { VError } from "verror";

export async function getParents(
  taskId: number,
  visited: Set<number> = Set(),
  containSubtasks: boolean = true
): Promise<TasksPack> {
  if (visited.has(taskId)) {
    throw new Error("Circular reference detected.");
  }
  visited = visited.add(taskId);

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
  generation?: number
): Promise<Record<number, Task[]>> {
  const subtasks = await prisma.task.findMany({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { parentId: taskId },
  });
  if (generation && generation <= 1) {
    return { [taskId]: subtasks };
  }
  const newGeneration = generation ? generation - 1 : generation;
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
    await prisma.$transaction([
      prisma.task.update({
        where: {
          id: taskId,
        },
        data: {
          parentId: task.parent.parentId,
        },
      }),
      prisma.taskDependency.deleteMany({
        where: {
          OR: [{ taskId: taskId }, { dependentId: taskId }],
        },
      }),
    ]);
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

  if (
    (task && newParent && task.parentId !== newParent.parentId) ||
    (!task && newParent) ||
    (task && !newParent)
  ) {
    throw Error(
      "invalid lower the new parent must be the sister task of the current task"
    );
  }

  await prisma.$transaction([
    prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        parentId: newParentId,
      },
    }),
    prisma.taskDependency.deleteMany({
      where: {
        OR: [{ taskId: taskId }, { dependentId: taskId }],
      },
    }),
  ]);
}

const TaskStatusShift: Record<string, string[]> = {
  "Not Started": ["In Progress", "Canceled", "On Hold"],
  "In Progress": ["Done", "On Hold", "Canceled"],
  Canceled: [], // No transitions out of "Canceled"
  "On Hold": ["In Progress", "Canceled", "Deferred"],
  Done: [], // No transitions out of "Done"
  Deferred: ["In Progress", "Canceled", "On Hold"], // Restart or cancel deferred tasks
};

export async function shiftTaskStatus(taskId: number, newStatus: string) {
  const task = await prisma.task.findUnique({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: {
      id: taskId,
    },
  });

  if (
    task &&
    TaskStatusShift.hasOwnProperty(task.status) &&
    TaskStatusShift[task.status].includes(newStatus)
  ) {
    return await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: newStatus,
      },
    });
  } else {
    if (task) {
      throw new Error(
        `Failed to shiftTaskStatus, taskId: ${task.id} currentStatus: ${task.status} newStatus: ${newStatus}.`
      );
    } else {
      throw new Error(`Failed to find the task, Id: ${taskId}.`);
    }
  }
}

export async function setTimeEstimate(taskId: number, timeEstimate: number) {
  const task = await prisma.task.findUnique({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: {
      id: taskId,
    },
    include: {
      subtasks: true,
    },
  });

  if (task) {
    if (task.timeEstimate && task.timeEstimate > timeEstimate) {
      const subTasks = await getSubtasks(taskId);
      const subTasksTime = subTasks[taskId]
        .map((t) => t.timeEstimate)
        .reduce<number>((prev, curr) => prev + (curr || 0), 0);
      if (subTasksTime > timeEstimate) {
        throw Error("")
      }
    }

    return await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        timeEstimate,
      },
    });
  } else {
    throw new Error(`Failed to find the task, Id: ${taskId}.`);
  }
}

export async function getDependencyClosure(taskIds: number[]) {
  let taskIdsSet = Set<number>();
  let toSearch = Set(taskIds);

  while (!toSearch.isEmpty()) {
    const dependencyIds = (
      await prisma.taskDependency.findMany({
        cacheStrategy: { swr: 60, ttl: 60 },
        where: {
          dependentId: {
            in: [...toSearch],
          },
        },
      })
    ).map((t) => t.dependentId);
    toSearch = Set(dependencyIds).subtract(taskIdsSet);
    taskIdsSet = taskIdsSet.union(dependencyIds);
  }
  return [...taskIdsSet];
}

export async function addDependency(taskId: number, depencencyIds: number[]) {
  const depencenciesClosure = await getDependencyClosure(depencencyIds);
  if ([...depencenciesClosure, ...depencencyIds].includes(taskId)) {
    throw Error("Cannot set dependency: introducing circular dependency.");
  }
  const tasks = await prisma.task.findMany({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: {
      id: {
        in: [taskId, ...depencencyIds],
      },
    },
  });

  const task = tasks.find((t) => t.id === taskId);
  const depencencies = tasks.filter((t) => depencencyIds.includes(t.id));
  if (!task) {
    throw Error(`Can not find task ${taskId}`);
  }
  if (depencencies.length !== depencencyIds.length) {
    throw new Error("can not find all depencencies.");
  }
  if (
    (task.parentId &&
      depencencies
        .map((t) => t.parentId === task.parentId)
        .reduce((prev, curr) => prev && curr)) ||
    depencencies.map((t) => !t.parentId).reduce((prev, curr) => prev && curr)
  ) {
    //TODO if postgresql can use duplicate parameter
    const alreadyHas = (
      await prisma.taskDependency.findMany({
        where: {
          dependentId: taskId,
        },
      })
    ).map((r) => r.taskId);
    const newDepencencyIds = Set(depencencyIds).subtract(alreadyHas).toArray();
    await prisma.taskDependency.createMany({
      data: newDepencencyIds.map((id) => {
        return {
          taskId: id,
          dependentId: taskId,
        };
      }),
    });
  }
}
