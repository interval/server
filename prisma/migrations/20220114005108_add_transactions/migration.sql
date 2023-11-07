-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'HOST_CONNECTION_DROPPED');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "lastFunctionCall" TEXT,
    "status" "TransactionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_createdAt_key" ON "Transaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_updatedAt_key" ON "Transaction"("updatedAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
