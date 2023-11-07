-- AlterTable
ALTER TABLE "ActionGroupMetadata" ALTER COLUMN "availability" DROP NOT NULL,
ALTER COLUMN "availability" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ActionMetadata" ALTER COLUMN "availability" DROP NOT NULL,
ALTER COLUMN "availability" DROP DEFAULT;

-- Update
-- Set existing metadata availability to null, since that's basically the current behavior.
-- Actions either have undefined avaiability or GROUPS availability; we're adding the option
-- to explicitly set ORGANIZATION availability, primarily within a restricted group.
UPDATE "ActionMetadata" SET "availability" = null WHERE "availability" = 'ORGANIZATION';
UPDATE "ActionGroupMetadata" SET "availability" = null WHERE "availability" = 'ORGANIZATION';