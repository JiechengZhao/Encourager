import { getTask, prisma } from "../lib/db";

describe("Task Functions", () => {
  test("add task 1", async () => {
    // Seed your test database
    await prisma.task.create({
      data: {
        name: "Task 1",
        description: "Root task",
        subDialogId: 2,
      },
    });
  });

  test("add task 2", async () => {
    await prisma.task.create({
      data: {
        name: "Task 1.1",
        description: "Child task",
        subDialogId: 2,
        parentId: 1
      },
    });
  });

  test("get task", async () => {
    const task = await getTask(1, 3)
    console.log(task)
  })

  test("get task 2", async () => {
    const task = await getTask(2, 3)
    console.log(task)
  })
});
