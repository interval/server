-- CreateTable
CREATE TABLE "UserPasswordResetToken" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + '30 minutes',

    CONSTRAINT "UserPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPasswordResetToken_userId_key" ON "UserPasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "UserPasswordResetToken" ADD CONSTRAINT "UserPasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
