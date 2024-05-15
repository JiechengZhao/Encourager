import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Create test records
  const testConversations = [
    {
      title: "First Conversation",
      description: "This is the first test conversation.",
    },
    {
      title: "Second Conversation",
      description: "This is the second test conversation.",
    },
  ];

  // Insert test records
  for (const conversation of testConversations) {
    await prisma.conversation.create({
      data: conversation,
    });
  }

  console.log("Test records inserted successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
