-- CreateEnum
CREATE TYPE "ActionAccessLevel" AS ENUM ('VIEWER', 'RUNNER');

-- CreateEnum
CREATE TYPE "ActionAvailability" AS ENUM ('ORGANIZATION', 'GROUPS');

-- AlterTable
ALTER TABLE "ActionMetadata" ADD COLUMN     "availability" "ActionAvailability" NOT NULL DEFAULT E'ORGANIZATION';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserAccessGroup" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessGroupMembership" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "userOrganizationAccessId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionAccess" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "actionMetadataId" TEXT NOT NULL,
    "userAccessGroupId" TEXT NOT NULL,
    "level" "ActionAccessLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessGroupMembership_userOrganizationAccessId_groupId_key" ON "UserAccessGroupMembership"("userOrganizationAccessId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionAccess_actionMetadataId_userAccessGroupId_key" ON "ActionAccess"("actionMetadataId", "userAccessGroupId");

-- AddForeignKey
ALTER TABLE "UserAccessGroup" ADD CONSTRAINT "UserAccessGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessGroupMembership" ADD CONSTRAINT "UserAccessGroupMembership_userOrganizationAccessId_fkey" FOREIGN KEY ("userOrganizationAccessId") REFERENCES "UserOrganizationAccess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessGroupMembership" ADD CONSTRAINT "UserAccessGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserAccessGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAccess" ADD CONSTRAINT "ActionAccess_userAccessGroupId_fkey" FOREIGN KEY ("userAccessGroupId") REFERENCES "UserAccessGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAccess" ADD CONSTRAINT "ActionAccess_actionMetadataId_fkey" FOREIGN KEY ("actionMetadataId") REFERENCES "ActionMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
