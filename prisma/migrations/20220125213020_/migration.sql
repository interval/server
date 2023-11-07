-- AlterTable
ALTER TABLE "UserPasswordResetToken" ALTER COLUMN "expiresAt" SET DEFAULT now() + '30 minutes';
