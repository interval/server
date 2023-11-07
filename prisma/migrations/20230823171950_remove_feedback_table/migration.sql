/*
  Warnings:

  - You are about to drop the `UserFeedback` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserFeedback" DROP CONSTRAINT "UserFeedback_userId_fkey";

-- DropTable
DROP TABLE "UserFeedback";

-- DropEnum
DROP TYPE "FeedbackSentiment";
