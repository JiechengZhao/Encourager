import { Task } from "@prisma/client";
import { getTask, prisma } from "@/lib/db";

afterAll(async () => {
  // Clean up the test database
  await prisma.$executeRaw`DROP TABLE IF EXISTS Task`;
  await prisma.$disconnect();
});

describe("Task Functions", () => {
  beforeEach(async () => {
    // Seed your test database
    await prisma.task.create({
      data: {
        name: "Task 1",
        description: "Root task",
        subDialogId: 1,
        parentId: null,
      },
    });

    await prisma.task.create({
      data: {
        name: "Task 1.1",
        description: "Child task",
        subDialogId: 1,
        parentId: 1,
      },
    });
  });

  afterEach(async () => {
    // Clean up data after each test
    await prisma.task.deleteMany({});
  });

  test("getParents should fetch task and its parents recursively", async () => {
    const task = await getParents(2);
    expect(task).toBeDefined();
    expect(task.parent).toBeDefined();
    expect(task.parent.name).toBe("Task 1");
  });

  test("getSubtasks should fetch task and its subtasks up to the specified generation", async () => {
    const subtasks = await getSubtasks(
      await prisma.task.findUnique({ where: { id: 1 } }),
      2
    );
    expect(subtasks).toBeDefined();
    expect(subtasks.length).toBeGreaterThan(0);
    expect(subtasks[0].name).toBe("Task 1.1");
  });

  test("getTask should fetch task with its parents and subtasks", async () => {
    const task = await getTask(1, 2);
    expect(task).toBeDefined();
    expect(task.subtasks).toBeDefined();
    expect(task.subtasks.length).toBeGreaterThan(0);
    expect(task.subtasks[0].name).toBe("Task 1.1");
  });
});
