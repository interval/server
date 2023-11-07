/*
  Warnings:

  - The values [USER_REGISTRATION_DISABLED] on the enum `ConfiguredFeatureFlag` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConfiguredFeatureFlag_new" AS ENUM ('USER_REGISTRATION_ENABLED', 'GHOST_MODE_ENABLED');
ALTER TABLE "GlobalFeatureFlag" ALTER COLUMN "flag" TYPE "ConfiguredFeatureFlag_new" USING ("flag"::text::"ConfiguredFeatureFlag_new");
ALTER TYPE "ConfiguredFeatureFlag" RENAME TO "ConfiguredFeatureFlag_old";
ALTER TYPE "ConfiguredFeatureFlag_new" RENAME TO "ConfiguredFeatureFlag";
DROP TYPE "ConfiguredFeatureFlag_old";
COMMIT;
