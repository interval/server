/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,slug]` on the table `UserAccessGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserAccessGroup" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessGroup_organizationId_slug_key" ON "UserAccessGroup"("organizationId", "slug");
