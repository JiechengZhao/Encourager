/*
  Warnings:

  - You are about to drop the column `dialogId` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `answer` on the `LLMDialog` table. All the data in the column will be lost.
  - You are about to drop the column `question` on the `LLMDialog` table. All the data in the column will be lost.
  - You are about to drop the column `sender` on the `LLMDialog` table. All the data in the column will be lost.
  - Added the required column `system` to the `LLMDialog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "QuestionAnswer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "lLMDialogId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionAnswer_lLMDialogId_fkey" FOREIGN KEY ("lLMDialogId") REFERENCES "LLMDialog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seq" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatMessage" ("content", "conversationId", "createdAt", "id", "sender", "seq") SELECT "content", "conversationId", "createdAt", "id", "sender", "seq" FROM "ChatMessage";
DROP TABLE "ChatMessage";
ALTER TABLE "new_ChatMessage" RENAME TO "ChatMessage";
CREATE TABLE "new_LLMDialog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "system" TEXT NOT NULL,
    "bot" TEXT NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LLMDialog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LLMDialog" ("bot", "conversationId", "createdAt", "id") SELECT "bot", "conversationId", "createdAt", "id" FROM "LLMDialog";
DROP TABLE "LLMDialog";
ALTER TABLE "new_LLMDialog" RENAME TO "LLMDialog";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
