-- CreateTable
CREATE TABLE "UserOutreachStatus" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "userId" TEXT NOT NULL,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "lastContactedBy" TEXT,

    CONSTRAINT "UserOutreachStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserOutreachStatus_userId_key" ON "UserOutreachStatus"("userId");

-- AddForeignKey
ALTER TABLE "UserOutreachStatus" ADD CONSTRAINT "UserOutreachStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
