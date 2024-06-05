-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TaskDependency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" INTEGER NOT NULL,
    "dependentId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TaskDependency" ("dependentId", "id", "taskId") SELECT "dependentId", "id", "taskId" FROM "TaskDependency";
DROP TABLE "TaskDependency";
ALTER TABLE "new_TaskDependency" RENAME TO "TaskDependency";
CREATE INDEX "TaskDependency_taskId_idx" ON "TaskDependency"("taskId");
CREATE INDEX "TaskDependency_dependentId_idx" ON "TaskDependency"("dependentId");
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subDialogId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "lowerTimeEstimate" REAL,
    "upperTimeEstimate" REAL,
    "dueDate" DATETIME,
    "conversationId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_subDialogId_fkey" FOREIGN KEY ("subDialogId") REFERENCES "SubDialog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("conversationId", "description", "dueDate", "id", "lowerTimeEstimate", "name", "parentId", "priority", "status", "subDialogId", "tags", "upperTimeEstimate") SELECT "conversationId", "description", "dueDate", "id", "lowerTimeEstimate", "name", "parentId", "priority", "status", "subDialogId", "tags", "upperTimeEstimate" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");
PRAGMA foreign_key_check("TaskDependency");
PRAGMA foreign_key_check("Task");
PRAGMA foreign_keys=ON;
