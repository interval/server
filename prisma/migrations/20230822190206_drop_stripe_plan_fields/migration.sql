/*
  Warnings:

  - You are about to drop the column `intendedPlanAtSignUp` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionPlan` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "intendedPlanAtSignUp",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "subscriptionPlan",
DROP COLUMN "subscriptionStatus";

-- DropEnum
DROP TYPE "StripeSubscriptionStatus";

-- DropEnum
DROP TYPE "SubscriptionPlanName";
