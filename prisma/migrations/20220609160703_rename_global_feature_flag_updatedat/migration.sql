/*
  Warnings:

  - You are about to drop the column `updatedat` on the `GlobalFeatureFlag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GlobalFeatureFlag" RENAME COLUMN "updatedat"
TO "updatedAt";
