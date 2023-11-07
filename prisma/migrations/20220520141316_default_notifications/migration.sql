-- AlterTable
ALTER TABLE "ActionMetadata" ADD COLUMN     "defaultNotificationDelivery" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultNotificationMethod" "NotificationMethod" DEFAULT E'EMAIL';
