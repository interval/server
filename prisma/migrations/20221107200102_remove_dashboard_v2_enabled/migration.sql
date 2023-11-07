/*
  Warnings:

  - The values [DASHBOARD_V2_ENABLED] on the enum `ConfiguredFeatureFlag` will be removed. If these variants are still used in the database, this will fail.

*/
-- Delete
DELETE FROM "OrganizationFeatureFlag" WHERE flag = 'DASHBOARD_V2_ENABLED';
DELETE FROM "GlobalFeatureFlag" WHERE flag = 'DASHBOARD_V2_ENABLED';

-- AlterEnum
BEGIN;
CREATE TYPE "ConfiguredFeatureFlag_new" AS ENUM ('USER_REGISTRATION_ENABLED', 'GHOST_MODE_ENABLED', 'SCHEDULED_ACTIONS_ENABLED', 'HTTP_HOSTS', 'ORG_ENVIRONMENTS_ENABLED');
ALTER TABLE "GlobalFeatureFlag" ALTER COLUMN "flag" TYPE "ConfiguredFeatureFlag_new" USING ("flag"::text::"ConfiguredFeatureFlag_new");
ALTER TABLE "OrganizationFeatureFlag" ALTER COLUMN "flag" TYPE "ConfiguredFeatureFlag_new" USING ("flag"::text::"ConfiguredFeatureFlag_new");
ALTER TYPE "ConfiguredFeatureFlag" RENAME TO "ConfiguredFeatureFlag_old";
ALTER TYPE "ConfiguredFeatureFlag_new" RENAME TO "ConfiguredFeatureFlag";
DROP TYPE "ConfiguredFeatureFlag_old";
COMMIT;
