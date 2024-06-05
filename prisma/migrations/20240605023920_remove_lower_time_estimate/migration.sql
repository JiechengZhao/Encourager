/*
  Warnings:

  - You are about to drop the column `lowerTimeEstimate` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `upperTimeEstimate` on the `Task` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subDialogId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "timeEstimate" REAL,
    "dueDate" DATETIME,
    "conversationId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_subDialogId_fkey" FOREIGN KEY ("subDialogId") REFERENCES "SubDialog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("conversationId", "createdAt", "description", "dueDate", "id", "name", "parentId", "priority", "status", "subDialogId", "tags") SELECT "conversationId", "createdAt", "description", "dueDate", "id", "name", "parentId", "priority", "status", "subDialogId", "tags" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");
PRAGMA foreign_key_check("Task");
PRAGMA foreign_keys=ON;
