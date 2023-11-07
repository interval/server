-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "isGhostMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "isGhostMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGhostMode" BOOLEAN NOT NULL DEFAULT false;
