-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_hostInstanceId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "hostInstanceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_hostInstanceId_fkey" FOREIGN KEY ("hostInstanceId") REFERENCES "HostInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
