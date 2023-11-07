-- CreateEnum
CREATE TYPE "ActionScheduleRunStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "actionScheduleId" TEXT;

-- CreateTable
CREATE TABLE "ActionSchedule" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "actionId" TEXT NOT NULL,
    "runnerId" TEXT,
    "second" TEXT NOT NULL,
    "minute" TEXT NOT NULL,
    "hour" TEXT NOT NULL,
    "dayOfMonth" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "timeZoneName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ActionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionScheduleRun" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "actionScheduleId" TEXT NOT NULL,
    "status" "ActionScheduleRunStatus" NOT NULL,
    "transactionId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionScheduleRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionScheduleRun_transactionId_key" ON "ActionScheduleRun"("transactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_actionScheduleId_fkey" FOREIGN KEY ("actionScheduleId") REFERENCES "ActionSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionSchedule" ADD CONSTRAINT "ActionSchedule_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionSchedule" ADD CONSTRAINT "ActionSchedule_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionScheduleRun" ADD CONSTRAINT "ActionScheduleRun_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionScheduleRun" ADD CONSTRAINT "ActionScheduleRun_actionScheduleId_fkey" FOREIGN KEY ("actionScheduleId") REFERENCES "ActionSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
