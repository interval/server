-- DropIndex
DROP INDEX "ApiKey_createdAt_key";

-- DropIndex
DROP INDEX "ApiKey_updatedAt_key";

-- DropIndex
DROP INDEX "Organization_createdAt_key";

-- DropIndex
DROP INDEX "Organization_updatedAt_key";

-- DropIndex
DROP INDEX "User_createdAt_key";

-- DropIndex
DROP INDEX "User_updatedAt_key";

-- DropIndex
DROP INDEX "UserOrganizationAccess_createdAt_key";

-- DropIndex
DROP INDEX "UserOrganizationAccess_updatedAt_key";

-- AlterTable
ALTER TABLE "UserOrganizationAccess" ADD COLUMN     "lastSwitchedToAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
