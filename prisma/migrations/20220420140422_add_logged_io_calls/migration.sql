-- CreateTable
CREATE TABLE "LoggedIOCall" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "methodName" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoggedIOCall_pkey" PRIMARY KEY ("id")
);
