-- DropForeignKey
ALTER TABLE "HttpHostRequest" DROP CONSTRAINT "HttpHostRequest_actionId_fkey";

-- AlterTable
ALTER TABLE "HttpHostRequest" ADD COLUMN     "actionGroupId" TEXT,
ALTER COLUMN "actionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "HttpHostRequest" ADD CONSTRAINT "HttpHostRequest_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HttpHostRequest" ADD CONSTRAINT "HttpHostRequest_actionGroupId_fkey" FOREIGN KEY ("actionGroupId") REFERENCES "ActionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
