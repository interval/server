/*
  Warnings:

  - You are about to drop the column `organizationEnvironmentId` on the `ActionMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `ActionMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `ActionMetadata` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[actionId]` on the table `ActionMetadata` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable - setting 'defaultValue' here so we can identify problem rows, if any
ALTER TABLE "ActionMetadata" ADD COLUMN "actionId" TEXT;

-- Update
UPDATE "ActionMetadata" SET "actionId" = (
  SELECT "Action"."id" FROM "Action"
  WHERE "ActionMetadata"."slug" = "Action"."slug"
  AND "ActionMetadata"."organizationId" = "Action"."organizationId"
  AND (
    "Action"."organizationEnvironmentId" = "ActionMetadata"."organizationEnvironmentId"
    OR ("Action"."organizationEnvironmentId" is null and "ActionMetadata"."organizationEnvironmentId" is null)
  )
  -- ignore development actions
  AND "Action"."developerId" IS NULL
);

-- Remove default value
ALTER TABLE "ActionMetadata" ALTER COLUMN "actionId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "ActionMetadata" DROP CONSTRAINT "ActionMetadata_organizationEnvironmentId_fkey";

-- DropForeignKey
ALTER TABLE "ActionMetadata" DROP CONSTRAINT "ActionMetadata_organizationId_fkey";

-- DropIndex
DROP INDEX "ActionMetadata_slug_organizationId_organizationEnvironmentI_key";

-- AlterTable
ALTER TABLE "ActionMetadata" DROP COLUMN "organizationEnvironmentId",
DROP COLUMN "organizationId",
DROP COLUMN "slug";

-- CreateIndex
CREATE UNIQUE INDEX "ActionMetadata_actionId_key" ON "ActionMetadata"("actionId");

-- AddForeignKey
ALTER TABLE "ActionMetadata" ADD CONSTRAINT "ActionMetadata_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
