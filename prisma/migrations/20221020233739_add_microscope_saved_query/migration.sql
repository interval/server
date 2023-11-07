-- CreateTable
CREATE TABLE "MicroscopeStoredQuery" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "MicroscopeStoredQuery_pkey" PRIMARY KEY ("id")
);
