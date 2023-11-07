/*
  Warnings:

  - You are about to drop the column `lastFunctionCall` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "lastFunctionCall",
ADD COLUMN     "currentClientId" TEXT,
ADD COLUMN     "lastIOCall" TEXT;
