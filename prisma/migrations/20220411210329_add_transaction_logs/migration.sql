-- CreateTable
CREATE TABLE "TransactionLogs" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,

    CONSTRAINT "TransactionLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLogs_transactionId_key" ON "TransactionLogs"("transactionId");

-- AddForeignKey
ALTER TABLE "TransactionLogs" ADD CONSTRAINT "TransactionLogs_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
