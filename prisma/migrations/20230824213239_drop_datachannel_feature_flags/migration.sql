/*
  Warnings:

  - The values [WEBRTC_DATA_CHANNELS_RPC,FORCE_WEBRTC_DATA_CHANNELS_RPC] on the enum `ConfiguredFeatureFlag` will be removed. If these variants are still used in the database, this will fail.

*/

-- Remove any rows that have a flag that is no longer valid
DELETE FROM "GlobalFeatureFlag" WHERE "flag" IN ('WEBRTC_DATA_CHANNELS_RPC', 'FORCE_WEBRTC_DATA_CHANNELS_RPC');

-- Remove any rows that have a flag that is no longer valid
DELETE FROM "OrganizationFeatureFlag" WHERE "flag" IN ('WEBRTC_DATA_CHANNELS_RPC', 'FORCE_WEBRTC_DATA_CHANNELS_RPC');


-- AlterEnum
BEGIN;
CREATE TYPE "ConfiguredFeatureFlag_new" AS ENUM ('USER_REGISTRATION_ENABLED', 'GHOST_MODE_ENABLED', 'TRANSACTION_LEGACY_NO_APPEND_UI', 'ACTION_METADATA_GENERAL_CONFIG', 'TABLE_TRUNCATION_DISABLED');
ALTER TABLE "GlobalFeatureFlag" ALTER COLUMN "flag" TYPE "ConfiguredFeatureFlag_new" USING ("flag"::text::"ConfiguredFeatureFlag_new");
ALTER TABLE "OrganizationFeatureFlag" ALTER COLUMN "flag" TYPE "ConfiguredFeatureFlag_new" USING ("flag"::text::"ConfiguredFeatureFlag_new");
ALTER TYPE "ConfiguredFeatureFlag" RENAME TO "ConfiguredFeatureFlag_old";
ALTER TYPE "ConfiguredFeatureFlag_new" RENAME TO "ConfiguredFeatureFlag";
DROP TYPE "ConfiguredFeatureFlag_old";
COMMIT;
