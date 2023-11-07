/*
  Warnings:

  - A unique constraint covering the columns `[name,organizationId,environment]` on the table `Action` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UsageEnvironment" AS ENUM ('PRODUCTION', 'DEVELOPMENT');

-- DropIndex
DROP INDEX "Action_name_organizationId_key";

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "environment" "UsageEnvironment" NOT NULL DEFAULT E'DEVELOPMENT';

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "environment" "UsageEnvironment" NOT NULL DEFAULT E'DEVELOPMENT';

-- AlterTable
ALTER TABLE "UserPasswordResetToken" ALTER COLUMN "expiresAt" SET DEFAULT now() + '30 minutes';

-- CreateIndex
CREATE UNIQUE INDEX "Action_name_organizationId_environment_key" ON "Action"("name", "organizationId", "environment");
