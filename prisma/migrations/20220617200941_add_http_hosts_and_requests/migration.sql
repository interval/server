/*
  Warnings:

  - A unique constraint covering the columns `[requestId]` on the table `HostInstance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_hostInstanceId_fkey";

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "httpHostId" TEXT,
ALTER COLUMN "hostInstanceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "HostInstance" ADD COLUMN     "requestId" TEXT;

-- CreateTable
CREATE TABLE "HttpHost" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "status" "HostInstanceStatus" NOT NULL,
    "url" TEXT NOT NULL,
    "sdkName" TEXT,
    "sdkVersion" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HttpHost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HttpHostRequest" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "httpHostId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HttpHostRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HttpHost_url_key" ON "HttpHost"("url");

-- CreateIndex
CREATE UNIQUE INDEX "HostInstance_requestId_key" ON "HostInstance"("requestId");

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_hostInstanceId_fkey" FOREIGN KEY ("hostInstanceId") REFERENCES "HostInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_httpHostId_fkey" FOREIGN KEY ("httpHostId") REFERENCES "HttpHost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostInstance" ADD CONSTRAINT "HostInstance_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "HttpHostRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HttpHost" ADD CONSTRAINT "HttpHost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HttpHostRequest" ADD CONSTRAINT "HttpHostRequest_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HttpHostRequest" ADD CONSTRAINT "HttpHostRequest_httpHostId_fkey" FOREIGN KEY ("httpHostId") REFERENCES "HttpHost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
