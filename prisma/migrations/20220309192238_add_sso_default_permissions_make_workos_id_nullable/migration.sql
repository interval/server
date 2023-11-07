-- AlterTable
ALTER TABLE "OrganizationSSO" ADD COLUMN     "defaultUserPermissions" "UserAccessPermission"[],
ALTER COLUMN "workosOrganizationId" DROP NOT NULL;
