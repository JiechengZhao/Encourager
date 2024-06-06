import { PrismaClient, Prisma } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

export const prisma = new PrismaClient().$extends(withAccelerate());

export async function getSettings() {
  const settings = await prisma.settings.findFirst({
    cacheStrategy: { swr: 60, ttl: 60 },
  });
  if (!settings) {
    throw new Error("No system settings. Please init the system first.");
  }
  return settings;
}

export async function setSettings(data) {
  // Update the settings in the database
  const updatedSettings = await prisma.settings.update({
    where: { id: 1 }, // Assuming there's only one row in the settings table
    data,
  });

  return updatedSettings;
}

async function main() {
  // Create test records
  await prisma.task.create({
    data: {
      name: "Task 3",
      description: "parent task",
      subDialogId: 2,
      parentId: 2

    },
  });

  await prisma.task.create({
    data: {
      name: "Task 4",
      description: "Child task",
      subDialogId: 2,
      parentId: 2
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
