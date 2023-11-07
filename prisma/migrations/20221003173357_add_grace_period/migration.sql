/*
  Warnings:

  - You are about to drop the column `ioCall` on the `TransactionRequirement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TransactionRequirement" DROP COLUMN "ioCall",
ADD COLUMN     "gracePeriodMs" INTEGER,
ADD COLUMN     "ioCallId" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3);
