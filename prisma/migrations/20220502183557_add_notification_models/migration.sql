-- CreateEnum
CREATE TYPE "NotificationMethod" AS ENUM ('EMAIL', 'SLACK');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'FAILED', 'DELIVERED');

-- AlterEnum
ALTER TYPE "UserAccessPermission" ADD VALUE 'WRITE_ORG_OAUTH';

-- AlterTable
ALTER TABLE "UserOrganizationAccess" ADD COLUMN     "slackOauthNonce" TEXT;

-- CreateTable
CREATE TABLE "OrganizationPrivate" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "slackAccessToken" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "OrganizationPrivate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "title" TEXT,
    "environment" "UsageEnvironment" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "NotificationMethod",
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT E'PENDING',
    "to" TEXT NOT NULL,
    "error" TEXT,
    "userId" TEXT,
    "notificationId" TEXT NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPrivate_organizationId_key" ON "OrganizationPrivate"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationPrivate" ADD CONSTRAINT "OrganizationPrivate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
