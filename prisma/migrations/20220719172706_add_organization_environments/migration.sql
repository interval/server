/*
  Warnings:

  - You are about to drop the column `environment` on the `ApiKey` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug,organizationId,developerId,organizationEnvironmentId]` on the table `Action` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug,organizationId,developerId,organizationEnvironmentId]` on the table `ActionGroup` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug,organizationId,organizationEnvironmentId]` on the table `ActionMetadata` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `usageEnvironment` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Action_slug_organizationId_developerId_key";

-- DropIndex
DROP INDEX "Action_slug_organizationId_null_developerId_key";

-- DropIndex
DROP INDEX "ActionGroup_slug_organizationId_developerId_key";

-- DropIndex
DROP INDEX "ActionMetadata_slug_organizationId_key";

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "organizationEnvironmentId" TEXT;

-- AlterTable
ALTER TABLE "ActionGroup" ADD COLUMN     "organizationEnvironmentId" TEXT;

-- AlterTable
ALTER TABLE "ActionMetadata" ADD COLUMN     "organizationEnvironmentId" TEXT;

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "organizationEnvironmentId" TEXT;

ALTER TABLE "ApiKey" RENAME COLUMN "environment" TO "usageEnvironment";

-- CreateTable
CREATE TABLE "OrganizationEnvironment" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "organizationId" TEXT NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Action_slug_organizationId_developerId_organizationEnvironm_key" ON "Action"("slug", "organizationId", "developerId", "organizationEnvironmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionGroup_slug_organizationId_developerId_organizationEnv_key" ON "ActionGroup"("slug", "organizationId", "developerId", "organizationEnvironmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionMetadata_slug_organizationId_organizationEnvironmentI_key" ON "ActionMetadata"("slug", "organizationId", "organizationEnvironmentId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationEnvironment_organizationId_slug_key" ON "OrganizationEnvironment"("organizationId", "slug")
WHERE "deletedAt" IS NULL;

-- Two NULL values are never considered equal, so we need these to cover those too
CREATE UNIQUE INDEX "OrganizationEnvironment_organizationId_null_slug_key" ON "OrganizationEnvironment"("organizationId", "slug")
WHERE "slug" IS NULL;

-- AddForeignKey
ALTER TABLE "OrganizationEnvironment" ADD CONSTRAINT "OrganizationEnvironment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationEnvironmentId_fkey" FOREIGN KEY ("organizationEnvironmentId") REFERENCES "OrganizationEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_organizationEnvironmentId_fkey" FOREIGN KEY ("organizationEnvironmentId") REFERENCES "OrganizationEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionGroup" ADD CONSTRAINT "ActionGroup_organizationEnvironmentId_fkey" FOREIGN KEY ("organizationEnvironmentId") REFERENCES "OrganizationEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionMetadata" ADD CONSTRAINT "ActionMetadata_organizationEnvironmentId_fkey" FOREIGN KEY ("organizationEnvironmentId") REFERENCES "OrganizationEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Two NULL values are never considered equal, so we need these to cover those too
CREATE UNIQUE INDEX "Action_slug_organizationId_null_orgEnv_devId_key" ON "Action"("slug", "organizationId")
WHERE "developerId" IS NULL AND "organizationEnvironmentId" IS NULL;

CREATE UNIQUE INDEX "Action_slug_organizationId_orgEnv_null_devId_key" ON "Action"("slug", "organizationId", "organizationEnvironmentId")
WHERE "developerId" IS NULL;

CREATE UNIQUE INDEX "Action_slug_organizationId_devId_null_orgEnv_key" ON "Action"("slug", "organizationId", "developerId")
WHERE "organizationEnvironmentId" IS NULL;

CREATE UNIQUE INDEX "ActionGroup_slug_organizationId_null_orgEnv_devId_key" ON "ActionGroup"("slug", "organizationId")
WHERE "developerId" IS NULL AND "organizationEnvironmentId" IS NULL;

CREATE UNIQUE INDEX "ActionGroup_slug_organizationId_orgEnv_null_devId_key" ON "ActionGroup"("slug", "organizationId", "organizationEnvironmentId")
WHERE "developerId" IS NULL;

CREATE UNIQUE INDEX "ActionGroup_slug_organizationId_devId_null_orgEnv_key" ON "ActionGroup"("slug", "organizationId", "developerId")
WHERE "organizationEnvironmentId" IS NULL;
