-- CreateTable
CREATE TABLE "UserReferralInfo" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "userId" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,

    CONSTRAINT "UserReferralInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserReferralInfo_userId_key" ON "UserReferralInfo"("userId");

-- AddForeignKey
ALTER TABLE "UserReferralInfo" ADD CONSTRAINT "UserReferralInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
