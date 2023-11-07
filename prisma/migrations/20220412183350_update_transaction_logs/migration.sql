/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `TransactionLogs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "TransactionLogs_transactionId_key";

-- AlterTable
ALTER TABLE "TransactionLogs" DROP COLUMN "updatedAt",
ALTER COLUMN "data" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TransactionLogs" RENAME TO "TransactionLog";