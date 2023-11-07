/*
  Warnings:

  - You are about to drop the column `environment` on the `Action` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug,organizationId,developerId]` on the table `Action` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "UserAccessPermission" ADD VALUE 'WRITE_PROD_ACTIONS';

-- DropIndex
DROP INDEX "Action_name_organizationId_environment_key";

-- CreateTable
CREATE TABLE "ActionMetadata" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionMetadata_pkey" PRIMARY KEY ("id")
);

-- Create ActionMetadata for existing production Action deployments
WITH meta AS (
    SELECT regexp_replace(lower("name"), '\W', '_', 'g'), "name", "organizationId"
    FROM "Action"
    WHERE "environment" = 'PRODUCTION'
)
INSERT INTO "ActionMetadata" ("slug", "name", "organizationId")
SELECT * FROM meta;

ALTER TABLE "Action"
RENAME COLUMN "name" TO "slug";

-- Convert Action name to slug
UPDATE "Action" set "slug" = regexp_replace(lower("slug"), '\W', '_', 'g');

-- AlterTable
ALTER TABLE "Action" ADD COLUMN "developerId" TEXT;
-- Add developerId for development actions
UPDATE "Action" SET "developerId" = "userId"
FROM "ApiKey"
    JOIN "HostInstance" on "HostInstance"."apiKeyId" = "ApiKey"."id"
WHERE "Action"."hostInstanceId" = "HostInstance"."id"
    AND "Action"."environment" = 'DEVELOPMENT';

ALTER TABLE "Action" DROP COLUMN "environment";

-- CreateIndex
CREATE UNIQUE INDEX "ActionMetadata_slug_organizationId_key" ON "ActionMetadata"("slug", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionMetadata_name_organizationId_key" ON "ActionMetadata"("name", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Action_slug_organizationId_developerId_key" ON "Action"("slug", "organizationId", "developerId");

-- Two NULL values are never considered equal, so we need this to cover those too
CREATE UNIQUE INDEX "Action_slug_organizationId_null_developerId_key" ON "Action"("slug", "organizationId")
WHERE "developerId" IS NULL;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- ALTER TABLE "Action" ADD CONSTRAINT "Action_slug_organizationId_fkey" FOREIGN KEY ("slug", "organizationId") REFERENCES "ActionMetadata"("slug", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionMetadata" ADD CONSTRAINT "ActionMetadata_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
