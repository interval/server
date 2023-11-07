/*
  Warnings:

  - A unique constraint covering the columns `[scimGroupId]` on the table `UserAccessGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserAccessGroup" ADD COLUMN     "scimGroupId" TEXT;

-- CreateTable
CREATE TABLE "OrganizationSCIMDirectory" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "organizationId" TEXT NOT NULL,
    "workosDirectoryId" TEXT NOT NULL,

    CONSTRAINT "OrganizationSCIMDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSCIMDirectory_organizationId_key" ON "OrganizationSCIMDirectory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSCIMDirectory_workosDirectoryId_key" ON "OrganizationSCIMDirectory"("workosDirectoryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessGroup_scimGroupId_key" ON "UserAccessGroup"("scimGroupId");

-- AddForeignKey
ALTER TABLE "OrganizationSCIMDirectory" ADD CONSTRAINT "OrganizationSCIMDirectory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
