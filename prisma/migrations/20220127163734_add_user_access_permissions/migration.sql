-- CreateEnum
CREATE TYPE "UserAccessPermission" AS ENUM ('ADMIN', 'DEVELOPER', 'ACTION_RUNNER', 'READONLY_VIEWER', 'RUN_DEV_ACTIONS', 'RUN_PROD_ACTIONS', 'READ_DEV_ACTIONS', 'READ_PROD_ACTIONS', 'READ_DEV_TRANSACTIONS', 'READ_PROD_TRANSACTIONS', 'READ_USERS', 'WRITE_USERS', 'CREATE_DEV_API_KEYS', 'CREATE_PROD_API_KEYS', 'READ_ORG_USER_API_KEY_EXISTENCE', 'DELETE_ORG_USER_API_KEYS', 'WRITE_ORG_SETTINGS');

-- AlterTable
ALTER TABLE "UserOrganizationAccess" ADD COLUMN     "permissions" "UserAccessPermission"[];

-- Can't set a default value for lists, so we just manually set existing user permissions here
UPDATE "UserOrganizationAccess" SET "permissions" = '{ADMIN}' WHERE ("permissions" is null or "permissions" = '{}')
