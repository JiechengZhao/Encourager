-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subDialogId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "dueDate" DATETIME,
    "conversationId" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Task_subDialogId_fkey" FOREIGN KEY ("subDialogId") REFERENCES "SubDialog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("completed", "description", "dueDate", "id", "name", "parentId", "priority", "subDialogId") SELECT "completed", "description", "dueDate", "id", "name", "parentId", "priority", "subDialogId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_key_check("Task");
PRAGMA foreign_keys=ON;
