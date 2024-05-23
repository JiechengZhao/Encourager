/*
  Warnings:

  - Added the required column `state` to the `SubDialog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task` to the `SubDialog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubDialog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversationId" INTEGER NOT NULL,
    "task" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubDialog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SubDialog" ("conversationId", "createdAt", "id") SELECT "conversationId", "createdAt", "id" FROM "SubDialog";
DROP TABLE "SubDialog";
ALTER TABLE "new_SubDialog" RENAME TO "SubDialog";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
