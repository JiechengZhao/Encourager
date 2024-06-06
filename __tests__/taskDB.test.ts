import { getTask, newTask, addDependency } from "@/lib/taskDB";
import { Task } from "@prisma/client";
import _ from "lodash";

const newTasks = async () => {
  const task0 = await newTask(`test task 0`, 4, `0`);
  const res = [task0]
  for (let i = 1; i < 16; i++) {
    const pid = Math.floor(i/3.5)
    const task = await newTask(`test task ${i} of ${pid}`, 4, `${pid}.${i}`, res[pid].id);
    console.log(`${pid}.${i}`)
    res.push(task)
  }
  for (let i = 16; i < 22; i++) {
    const pid = 1
    const task = await newTask(`test task ${i} of ${pid}`, 4, `${pid}.${i}`, res[pid].id);
    console.log(`${pid}.${i}`)
    res.push(task)
  }
  return res
};

describe("tasks", () => {
  let tasks: Task[];
  beforeAll(async () => {
    tasks = await newTasks();
  });

  test("create and get", async () => {
    const taskId = tasks[1].id;
    const task = await getTask(taskId);
    expect(task).toMatchObject({ current: taskId });
    expect(task).toHaveProperty("tasks");
    expect(task).toHaveProperty("root");
    for (const i of Object.keys(task.tasks)) {
      expect(task.tasks[taskId]).toMatchObject({ id: taskId });
    }
  });

  describe("depenency",  () => {
    beforeAll(async () => {
      await addDependency(tasks[2].id, [tasks[1].id, tasks[3].id]);
      await addDependency(tasks[4].id, [tasks[2].id]);
    });
    test("can not add db", async () => {
      await expect(addDependency(tasks[0].id, [tasks[1].id, tasks[3].id])).rejects.toThrow("")
    })
  });
});
