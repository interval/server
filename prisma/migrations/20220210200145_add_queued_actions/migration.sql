-- CreateTable
CREATE TABLE "QueuedAction" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "actionId" TEXT NOT NULL,
    "transactionId" TEXT,
    "assigneeId" TEXT,
    "params" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueuedAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QueuedAction_transactionId_key" ON "QueuedAction"("transactionId");

-- AddForeignKey
ALTER TABLE "QueuedAction" ADD CONSTRAINT "QueuedAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueuedAction" ADD CONSTRAINT "QueuedAction_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueuedAction" ADD CONSTRAINT "QueuedAction_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
