-- AlterTable
ALTER TABLE "TransactionLog" RENAME CONSTRAINT "TransactionLogs_pkey" TO "TransactionLog_pkey";

-- RenameForeignKey
ALTER TABLE "TransactionLog" RENAME CONSTRAINT "TransactionLogs_transactionId_fkey" TO "TransactionLog_transactionId_fkey";
