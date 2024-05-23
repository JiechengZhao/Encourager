/*
  Warnings:

  - You are about to drop the column `state` on the `SubDialog` table. All the data in the column will be lost.
  - Added the required column `status` to the `SubDialog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubDialog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversationId" INTEGER NOT NULL,
    "task" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubDialog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SubDialog" ("conversationId", "createdAt", "id", "task") SELECT "conversationId", "createdAt", "id", "task" FROM "SubDialog";
DROP TABLE "SubDialog";
ALTER TABLE "new_SubDialog" RENAME TO "SubDialog";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
