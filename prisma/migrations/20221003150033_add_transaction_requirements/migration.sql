-- CreateEnum
CREATE TYPE "TransactionRequirementType" AS ENUM ('IDENTITY_CONFIRM');

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "identityConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TransactionRequirement" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "TransactionRequirementType" NOT NULL,
    "ioCall" TEXT,
    "satisfiedAt" TIMESTAMP(3),

    CONSTRAINT "TransactionRequirement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransactionRequirement" ADD CONSTRAINT "TransactionRequirement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
