-- CreateTable
CREATE TABLE "SimpleTalk" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botName" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "system" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
