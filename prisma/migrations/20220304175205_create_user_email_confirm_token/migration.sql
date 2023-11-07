-- CreateTable
CREATE TABLE "UserEmailConfirmToken" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + '30 minutes',

    CONSTRAINT "UserEmailConfirmToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmailConfirmToken_userId_key" ON "UserEmailConfirmToken"("userId");

-- AddForeignKey
ALTER TABLE "UserEmailConfirmToken" ADD CONSTRAINT "UserEmailConfirmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
