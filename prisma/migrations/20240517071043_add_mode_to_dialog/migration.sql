-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LLMDialog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "system" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'AI',
    "bot" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'use history',
    "conversationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LLMDialog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LLMDialog" ("bot", "conversationId", "createdAt", "id", "mode", "system") SELECT "bot", "conversationId", "createdAt", "id", "mode", "system" FROM "LLMDialog";
DROP TABLE "LLMDialog";
ALTER TABLE "new_LLMDialog" RENAME TO "LLMDialog";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
