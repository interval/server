-- CreateEnum
CREATE TYPE "SdkAlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "SdkAlert" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "sdkName" TEXT NOT NULL,
    "minSdkVersion" TEXT NOT NULL,
    "severity" "SdkAlertSeverity" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SdkAlert_pkey" PRIMARY KEY ("id")
);
