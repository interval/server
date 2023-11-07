-- DropIndex
DROP INDEX "Action_createdAt_key";

-- DropIndex
DROP INDEX "Action_updatedAt_key";

-- AlterTable
ALTER TABLE "Action" ALTER COLUMN "id" SET DEFAULT nanoid();
