-- CreateEnum
CREATE TYPE "ConfiguredFeatureFlag" AS ENUM ('USER_REGISTRATION_DISABLED', 'GHOST_MODE_ENABLED');

-- CreateTable
CREATE TABLE "GlobalFeatureFlag" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "flag" "ConfiguredFeatureFlag" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalFeatureFlag_flag_key" ON "GlobalFeatureFlag"("flag");
