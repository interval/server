-- CreateTable
CREATE TABLE "UserWaitlistEntry" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "organizationName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWaitlistEntry_email_key" ON "UserWaitlistEntry"("email");
