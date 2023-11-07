/*
  Warnings:

  - A unique constraint covering the columns `[mfaId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ssoAccessToken]` on the table `UserSession` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mfaChallengeId]` on the table `UserSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "requireMfa" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaId" TEXT;

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "mfaChallengeId" TEXT,
ADD COLUMN     "ssoAccessToken" TEXT;

-- CreateTable
CREATE TABLE "UserMfaChallenge" (
    "id" TEXT NOT NULL,
    "mfaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "UserMfaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mfaId_key" ON "User"("mfaId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_ssoAccessToken_key" ON "UserSession"("ssoAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_mfaChallengeId_key" ON "UserSession"("mfaChallengeId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_mfaChallengeId_fkey" FOREIGN KEY ("mfaChallengeId") REFERENCES "UserMfaChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
