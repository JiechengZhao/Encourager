import { PrismaClient, Prisma } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

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


