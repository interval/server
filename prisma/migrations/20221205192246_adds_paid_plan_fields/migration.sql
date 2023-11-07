-- CreateEnum
CREATE TYPE "SubscriptionPlanName" AS ENUM ('FREE', 'TEAMS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "StripeSubscriptionStatus" AS ENUM ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "subscriptionPlan" "SubscriptionPlanName" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "subscriptionStatus" "StripeSubscriptionStatus" NOT NULL DEFAULT 'active';
