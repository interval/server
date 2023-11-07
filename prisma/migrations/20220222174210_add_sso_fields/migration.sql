/*
  Warnings:

  - A unique constraint covering the columns `[idpId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idpId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OrganizationSSO" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "workosOrganizationId" TEXT NOT NULL,

    CONSTRAINT "OrganizationSSO_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSSO_organizationId_key" ON "OrganizationSSO"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSSO_domain_key" ON "OrganizationSSO"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSSO_workosOrganizationId_key" ON "OrganizationSSO"("workosOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_idpId_key" ON "User"("idpId");

-- AddForeignKey
ALTER TABLE "OrganizationSSO" ADD CONSTRAINT "OrganizationSSO_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
