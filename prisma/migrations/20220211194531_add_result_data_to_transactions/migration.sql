/*
  Warnings:

  - The values [SUCCESS] on the enum `TransactionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TransactionResultStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "resultData" JSONB,
ADD COLUMN     "resultSchemaVersion" INTEGER,
ADD COLUMN     "resultStatus" "TransactionResultStatus";

-- AlterEnum
BEGIN;
	-- Create new enum type
	CREATE TYPE "TransactionStatus_new" AS ENUM ('RUNNING', 'COMPLETED', 'HOST_CONNECTION_DROPPED', 'PENDING');
	-- Create temporary enum type containing union of new and old values
	CREATE TYPE "TransactionStatus_temp" AS ENUM ('RUNNING', 'COMPLETED', 'HOST_CONNECTION_DROPPED', 'PENDING', 'SUCCESS');

	-- Use union enum type
	ALTER TABLE "Transaction" ALTER COLUMN "status" TYPE "TransactionStatus_temp" USING ("status"::text::"TransactionStatus_temp");

	-- Set result for successful transactions
	UPDATE "Transaction" SET "resultStatus" = 'SUCCESS' WHERE "status" = 'SUCCESS';
	-- Set completedAt = updatedAt for successful transactions
	UPDATE "Transaction" SET "completedAt" = "updatedAt" where "status" = 'SUCCESS';

	-- Convert SUCCESS transaction state to COMPLETED
	UPDATE "Transaction" SET "status" = 'COMPLETED' WHERE "status" = 'SUCCESS';

	-- Use new enum type without 'SUCCESS' value
	ALTER TABLE "Transaction" ALTER COLUMN "status" TYPE "TransactionStatus_new" USING ("status"::text::"TransactionStatus_new");

	-- Rename types to remove _new from the final type
	ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
	ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";

	-- Drop old and temporary types
	DROP TYPE "TransactionStatus_old";
	DROP TYPE "TransactionStatus_temp";
COMMIT;

