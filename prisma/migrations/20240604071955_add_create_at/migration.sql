/*
  Warnings:

  - The primary key for the `TaskDependency` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `TaskDependency` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TaskDependency" (
    "taskId" INTEGER NOT NULL,
    "dependentId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("taskId", "dependentId"),
    CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TaskDependency" ("createdAt", "dependentId", "taskId") SELECT "createdAt", "dependentId", "taskId" FROM "TaskDependency";
DROP TABLE "TaskDependency";
ALTER TABLE "new_TaskDependency" RENAME TO "TaskDependency";
CREATE INDEX "TaskDependency_taskId_idx" ON "TaskDependency"("taskId");
CREATE INDEX "TaskDependency_dependentId_idx" ON "TaskDependency"("dependentId");
PRAGMA foreign_key_check("TaskDependency");
PRAGMA foreign_keys=ON;
