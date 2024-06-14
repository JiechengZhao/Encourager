import { Task, Prisma } from "@prisma/client";
import { TasksPack, TaskRecord, TasksPackP } from "./types";
import { listToReco } from "./tools";
import { getAllTasksFromSubtaskRecords } from "./tools";
import { prisma } from "./db";
import { Set } from "immutable";
import { getMainDialogTemplate } from "./dialogTemplates";

/** Retrieves a task and all its parent tasks recursively
 */
export async function getParentsAndSelf(
  taskId: number,
  visited: Set<number> = Set()
): Promise<TasksPackP> {
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
      const parent = await getParentsAndSelf(task.parentId, visited);
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

/**
 * Retrieves all subtasks of a task recursively
 */
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
/**
 * Retrieves a single task by its ID
 */
export async function getTask(taskId: number) {
  return await prisma.task.findUnique({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { id: taskId },
  });
}

/**
 * Retrieves a task and its subtasks and parent tasks recursively
 * @param layer how many layers of subtasks to retrieve. Do now pass will get all subtasks and subtasks of subtasks.
 */
export async function getFullTask(
  taskId: number,
  layer?: number
): Promise<TasksPack> {
  const task = await prisma.task.findUnique({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: { id: taskId },
  });
  if (task) {
    const subtasks = await getSubtasks(task.id, layer);
    const tasks: TaskRecord = getAllTasksFromSubtaskRecords(subtasks, {
      [task.id]: task,
    });
    for (const key of Object.keys(subtasks)) {
      const id = Number(key);
      tasks[id] = { ...tasks[id], subtasks: subtasks[id].map((t) => t.id) };
    }
    if (task.parentId) {
      const parent = await getParentsAndSelf(task.parentId);
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
    throw new Error(`can not find the task id: ${taskId}`);
  }
}
/**
 * Creates a new task
 */
export async function newTask(
  name: string,
  subDialogId: number,
  description?: string,
  parentId?: number
) {
  return await prisma.$transaction(async (prisma) => {
    // Create the conversation
    const conversation = await prisma.conversation.create({
      data: {
        title: name,
        dialogs: {
          create: [getMainDialogTemplate()],
        },
      },
    });

    // Create the task
    const task = await prisma.task.create({
      data: {
        name,
        description,
        subDialogId,
        parentId,
        conversationId: conversation.id,
      },
    });

    return task;
  });
}
/**
 * Moves a task to the level of its parent
 */
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
    throw new Error("Can not lift the task, Already the top level.");
  }
}

/**
 * Moves a task under one of its sister
 */
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
    throw new Error(
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

//Defines valid status transitions for tasks
const TaskStatusShift: Record<string, string[]> = {
  "Not Started": ["In Progress", "Canceled", "On Hold"],
  "In Progress": ["Done", "On Hold", "Canceled"],
  Canceled: [], // No transitions out of "Canceled"
  "On Hold": ["In Progress", "Canceled", "Deferred"],
  Done: [], // No transitions out of "Done"
  Deferred: ["In Progress", "Canceled", "On Hold"], // Restart or cancel deferred tasks
};

/**
 * Changes the status of a task if the transition is valid
 */
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
/**
 * Retrieves tasks that the given tasks depend on
 */
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
    ).map((t) => t.taskId);
    toSearch = Set(dependencyIds).subtract(taskIdsSet);
    taskIdsSet = taskIdsSet.union(dependencyIds);
  }
  return [...taskIdsSet];
}
/**
 * Retrieves all tasks that depend on the given tasks
 */
export async function getDependent(taskIds: number[]) {
  const dependentIds = await prisma.taskDependency.findMany({
    cacheStrategy: { swr: 60, ttl: 60 },
    where: {
      taskId: {
        in: taskIds,
      },
    },
  });
  return dependentIds.map((t) => t.dependentId);
}

/**
 * Adds dependencies to a task
 */
export async function addDependency(taskId: number, depencencyIds: number[]) {
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
    throw new Error(`Can not find task ${taskId}`);
  }
  if (depencencies.length !== depencencyIds.length) {
    throw new Error("can not find all depencencies.");
  }
  if (
    (task.parentId &&
      depencencies
        .map((t) => t.parentId === task.parentId)
        .reduce((prev, curr) => prev && curr)) ||
    (!task.parentId &&
      depencencies.map((t) => !t.parentId).reduce((prev, curr) => prev && curr))
  ) {
    const depencenciesClosure = await getDependencyClosure(depencencyIds);
    if ([...depencenciesClosure, ...depencencyIds].includes(taskId)) {
      throw new Error(
        "Cannot set dependency: introducing circular dependency."
      );
    }
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
  } else {
    throw new Error("Cannot set dependency: do not share same parent.");
  }
}
/**
 * remove dependencies of a task
 */
export async function removeDependency(
  taskId?: number,
  depencencyIds?: number[]
) {
  const where: {
    dependentId?: number;
    taskId?: {
      in: number[];
    };
  } = {};
  if (!taskId && !depencencyIds) {
    throw new Error("must specify taskId or depencencyIds");
  }
  if (taskId) {
    where.dependentId = taskId;
  }
  if (depencencyIds) {
    where.taskId = {
      in: depencencyIds,
    };
  }
  await prisma.taskDependency.deleteMany({
    where,
  });
}
/** Sets the time estimate for a task and updates parent tasks if necessary
 */
export async function setTimeEstimate(
  taskId: number,
  timeEstimate: number,
  autoExpand: boolean = true
) {
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
      const subTasksTime = task.subtasks
        .filter(activeTasks)
        .map((t) => t.timeEstimate)
        .reduce<number>((prev, curr) => prev + (curr || 0), 0);
      if (subTasksTime > timeEstimate) {
        throw new Error(
          "The estimated time for the new task is smaller than the sum of the estimated times for all its subtasks. Please review and adjust the estimated times accordingly."
        );
      }

      return await prisma.task.update({
        where: {
          id: taskId,
        },
        data: {
          timeEstimate,
        },
      });
    } else if (task.parentId) {
      const update = [];
      const { tasks } = await getParentsAndSelf(task.parentId);
      let currentTaskId = task.parentId;
      tasks[taskId].timeEstimate = timeEstimate;
      while (currentTaskId) {
        const currentTask = tasks[currentTaskId];
        const subTaskTime = currentTask.subtasks
          .filter((id) => activeTasks(tasks[id]))
          .map((id) => tasks[id].timeEstimate)
          .reduce<number>((prev, curr) => prev + (curr || 0), 0);
        if (
          !currentTask.timeEstimate ||
          subTaskTime > currentTask.timeEstimate
        ) {
          if (autoExpand) {
            currentTask.timeEstimate = subTaskTime;
            update.push({
              where: {
                id: currentTask.id,
              },
              data: {
                timeEstimate: currentTask.timeEstimate,
              },
            });
          } else {
            throw new Error(
              "Sum of the estimated time for the new task and its sisters exceeds the estimated times of its parent. Please review and adjust the estimated times accordingly."
            );
          }
        } else {
          break;
        }
        if (currentTask.parentId) {
          currentTaskId = currentTask.parentId;
        } else {
          break;
        }
      }
      const promises = update.reduce(
        (prev, curr) => [...prev, prisma.task.update(curr)],
        [
          prisma.task.update({
            where: {
              id: taskId,
            },
            data: {
              timeEstimate,
            },
          }),
        ]
      );

      const res = await prisma.$transaction(promises);
      return res[0];
    } else {
      return await prisma.task.update({
        where: {
          id: taskId,
        },
        data: {
          timeEstimate,
        },
      });
    }
  } else {
    throw new Error(`Failed to find the task, Id: ${taskId}.`);
  }

  function activeTasks(t: Task) {
    return t.status !== "Done" && t.status !== "Canceled";
  }
}
/** Calculates the total time estimate for all dependencies of a task
 */
export async function calculateDependencyTimeEstimate(taskId: number) {
  const { tasks } = await getParentsAndSelf(taskId);
  let currTaskId = taskId;
  let time = 0;
  const depencenciesReco: Record<number, number[]> = {};
  while (currTaskId >= 0) {
    const task = tasks[currTaskId];
    const dependencyIds = await getDependencyClosure([task.id]);
    const dependencies = await prisma.task.findMany({
      where: {
        id: {
          in: dependencyIds,
        },
      },
    });
    depencenciesReco[task.id] = dependencyIds;
    time = dependencies.reduce(
      (prev, curr) => prev + (curr.timeEstimate || 0),
      time
    );
    currTaskId = task.parentId || -1;
  }
  return { time, dependencies: depencenciesReco };
}
/** Modifies the details of a task */
export async function modifyTask(
  taskId: number,
  data: {
    name?: string;
    description?: string;
    priority?: number;
    conversationId?: number;
  }
) {
  if (!data.name && !data.description) {
    throw new Error("must give name or description or both.");
  }

  return await prisma.task.update({
    where: { id: taskId },
    data,
  });
}

export async function getAllTopTasks() {
  return await prisma.task.findMany({
    where: { parent: null },
    cacheStrategy: { swr: 60, ttl: 60 },
  });
}
