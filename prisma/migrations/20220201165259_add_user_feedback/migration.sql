-- CreateEnum
CREATE TYPE "FeedbackSentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackContent" TEXT,
    "feedbackTarget" TEXT,
    "feedbackTargetSnapshot" TEXT,
    "userReportedSentiment" "FeedbackSentiment",
    "prompt" TEXT,
    "userId" TEXT,
    "gitRevision" TEXT,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
