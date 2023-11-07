/*
  Warnings:

  - Added the required column `environment` to the `LoggedIOCall` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LoggedIOCall" ADD COLUMN     "environment" "UsageEnvironment" NOT NULL;
