/*
  Warnings:

  - You are about to drop the `NewsletterSubscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NewsletterSubscription" DROP CONSTRAINT "NewsletterSubscription_userId_fkey";

-- DropTable
DROP TABLE "NewsletterSubscription";
