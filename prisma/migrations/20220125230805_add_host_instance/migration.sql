/*
  Warnings:

  - You are about to drop the column `hostId` on the `Action` table. All the data in the column will be lost.
  - Added the required column `hostInstanceId` to the `Action` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hostInstanceId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HostInstanceStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- AlterTable
ALTER TABLE "Action" DROP COLUMN "hostId",
ADD COLUMN     "hostInstanceId" TEXT NOT NULL,
ALTER COLUMN "environment" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "environment" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "hostInstanceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserPasswordResetToken" ALTER COLUMN "expiresAt" SET DEFAULT now() + '30 minutes';

-- CreateTable
CREATE TABLE "HostInstance" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "status" "HostInstanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostInstance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_hostInstanceId_fkey" FOREIGN KEY ("hostInstanceId") REFERENCES "HostInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostInstance" ADD CONSTRAINT "HostInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostInstance" ADD CONSTRAINT "HostInstance_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_hostInstanceId_fkey" FOREIGN KEY ("hostInstanceId") REFERENCES "HostInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
