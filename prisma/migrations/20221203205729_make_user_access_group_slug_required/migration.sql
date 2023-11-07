/*
  Warnings:

  - Made the column `slug` on table `UserAccessGroup` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UserAccessGroup" ALTER COLUMN "slug" SET NOT NULL;
