/*
  Warnings:

  - Made the column `slug` on table `OrganizationEnvironment` required. This step will fail if there are existing NULL values in that column.

*/

UPDATE "OrganizationEnvironment" SET "slug" = 'production' WHERE "slug" IS NULL;

-- AlterTable
ALTER TABLE "OrganizationEnvironment" ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "slug" SET DEFAULT 'production';
