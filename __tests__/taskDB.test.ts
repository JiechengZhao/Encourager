import {
  getFullTask,
  newTask,
  addDependency,
  getDependencyClosure,
  removeDependency,
  liftTask,
  lowerTask,
  getTask,
  getDependent,
  setTimeEstimate,
  calculateDependencyTimeEstimate,
  getAllTopTasks,
} from "@/lib/taskDB";
import { Task } from "@prisma/client";
import _ from "lodash";

const newTasks = async () => {
  const task0 = await newTask(`test task 0`, 4, `0`);
  const res = [task0];
  const prtTags: Record<number, number[]> = {};
  for (let i = 1; i < 16; i++) {
    const pid = Math.floor(i / 3.5);
    await addTask(i, pid);
  }
  for (let i = 16; i < 22; i++) {
    const pid = 1;
    await addTask(i, pid);
  }
  console.log(prtTags);
  return res;

  async function addTask(i: number, pid: number) {
    const tag = `${i} { ${pid}`;
    const task = await newTask(`test task ${i} of ${pid}`, 4, tag, res[pid].id);
    if (prtTags.hasOwnProperty(pid)) {
      prtTags[pid].push(i);
    } else {
      prtTags[pid] = [i];
    }
    res.push(task);
  }
};

describe("tasks", () => {
  let tasks: Task[];
  beforeAll(async () => {
    tasks = await newTasks();
  });

  test("create and get", async () => {
    const taskId = tasks[1].id;
    const task = await getFullTask(taskId);
    expect(task).toMatchObject({ current: taskId });
    expect(task).toHaveProperty("tasks");
    expect(task).toHaveProperty("root");
    for (const i of Object.keys(task.tasks)) {
      expect(task.tasks[taskId]).toMatchObject({ id: taskId });
    }
  });

  test("get all top", async () => {
    const topTasks = (await getAllTopTasks()).map((t) => t.id);
    expect(topTasks).toContain(tasks[0].id);
    expect(topTasks.length).toBeGreaterThan(1);
  });

  const depencencyBeforeAll = async () => {
    await addDependency(tasks[2].id, [tasks[1].id, tasks[3].id]);
    await addDependency(tasks[4].id, [tasks[5].id, tasks[6].id]);
    await addDependency(tasks[6].id, [tasks[16].id, tasks[17].id]);
    await addDependency(tasks[16].id, [tasks[19].id, tasks[20].id]);
  };

  const depencencyAfterAll = async () => {
    await removeDependency(tasks[2].id, [tasks[1].id, tasks[3].id]);
    await removeDependency(tasks[4].id);
    await removeDependency(undefined, [tasks[16].id]);
    await removeDependency(tasks[6].id);
    await removeDependency(undefined, [tasks[19].id, tasks[20].id]);
  };

  describe("depenency", () => {
    beforeAll(depencencyBeforeAll);

    test("get depend", async () => {
      expect((await getDependencyClosure([tasks[2].id])).sort()).toEqual(
        [1, 3].map((i) => tasks[i].id)
      );
      expect((await getDependencyClosure([tasks[4].id])).sort()).toEqual(
        [5, 6, 16, 17, 19, 20].map((i) => tasks[i].id)
      );
    });

    test("can not add db if not the same parent case 1", async () => {
      await expect(
        addDependency(tasks[0].id, [tasks[1].id, tasks[3].id])
      ).rejects.toThrow("Cannot set dependency: do not share same parent.");
    });

    test("can not add db if not the same parent case 2", async () => {
      await expect(
        addDependency(tasks[1].id, [tasks[0].id, tasks[3].id])
      ).rejects.toThrow("Cannot set dependency: do not share same parent.");
    });

    test("can not add db if not the same parent case 3", async () => {
      await expect(
        addDependency(tasks[1].id, [tasks[4].id, tasks[3].id])
      ).rejects.toThrow("Cannot set dependency: do not share same parent.");
    });

    test("can not add db if circur establish", async () => {
      await expect(
        addDependency(tasks[3].id, [tasks[2].id, tasks[1].id])
      ).rejects.toThrow(
        "Cannot set dependency: introducing circular dependency."
      );
    });

    test("can not add db if circur establish deep", async () => {
      await expect(
        addDependency(tasks[20].id, [tasks[21].id, tasks[4].id])
      ).rejects.toThrow(
        "Cannot set dependency: introducing circular dependency."
      );
    });

    afterAll(depencencyAfterAll);
  });

  describe("lift and lower", () => {
    beforeAll(async () => {
      await depencencyBeforeAll();
    });

    test("lift", async () => {
      await liftTask(tasks[5].id);
      expect(await getTask(tasks[5].id)).toMatchObject({
        parentId: tasks[0].id,
      });
      expect(await getDependencyClosure([tasks[5].id])).toEqual([]);
      expect(await getDependent([tasks[5].id])).toEqual([]);
    });

    test("can not lift top", async () => {
      await expect(liftTask(tasks[0].id)).rejects.toThrow(
        "Can not lift the task, Already the top level."
      );
    });

    test("can not lower any", async () => {
      await expect(lowerTask(tasks[1].id, tasks[21].id)).rejects.toThrow(
        "invalid lower the new parent must be the sister task of the current task"
      );
    });

    test("lower", async () => {
      await lowerTask(tasks[2].id, tasks[1].id);

      expect(await getTask(tasks[2].id)).toMatchObject({
        parentId: tasks[1].id,
      });
      expect(await getDependencyClosure([tasks[2].id])).toEqual([]);
      expect(await getDependent([tasks[2].id])).toEqual([]);
    });

    afterAll(async () => {
      await liftTask(tasks[2].id);
      await lowerTask(tasks[5].id, tasks[1].id);
      await depencencyAfterAll();
    });
  });

  describe("estimate time", () => {
    beforeAll(async () => {
      await depencencyBeforeAll();
      await addDependency(tasks[1].id, [tasks[3].id]);
      await addDependency(tasks[15].id, [tasks[14].id]);
    });

    test("add estimate time at leaves", async () => {
      await setTimeEstimate(tasks[15].id, 1.5, true);
      await Promise.all(
        [15, 4, 1, 0].map(async (id) => {
          const task = await getTask(tasks[id].id);
          expect(task).toBeDefined;
          if (task) expect(task?.timeEstimate).toBeGreaterThanOrEqual(1.5);
        })
      );
    });

    test("add estimate time at parent be rejected", async () => {
      await expect(setTimeEstimate(tasks[1].id, 1, true)).rejects.toThrow(
        "The estimated time for the new task is smaller than the sum of the estimated times for all its subtasks. Please review and adjust the estimated times accordingly."
      );
    });

    test("add estimate time at parent ", async () => {
      await setTimeEstimate(tasks[1].id, 2, true);
    });

    test("add estimate time at leaves 2", async () => {
      await setTimeEstimate(tasks[14].id, 1.5, true);
      await expect(getTask(tasks[14].id)).resolves.toMatchObject({
        timeEstimate: 1.5,
      });

      await Promise.all(
        [4, 1, 0].map(async (id) => {
          const task = await getTask(tasks[id].id);
          expect(task?.timeEstimate).toBeGreaterThanOrEqual(3);
        })
      );
      await setTimeEstimate(tasks[11].id, 2);
      await setTimeEstimate(tasks[16].id, 1);
      await setTimeEstimate(tasks[20].id, 1);
      await expect(
        calculateDependencyTimeEstimate(tasks[15].id)
      ).resolves.toMatchObject({ time: 5.5 });
    });

    afterAll(async () => {
      await depencencyAfterAll();
      await removeDependency(tasks[1].id);
      await removeDependency(tasks[15].id);
    });
  });
});
