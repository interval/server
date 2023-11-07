/*
  Warnings:

  - You are about to drop the column `planName` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" RENAME COLUMN "planName" TO "intendedPlanAtSignUp";
