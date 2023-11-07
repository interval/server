/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,url]` on the table `HttpHost` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "HttpHost_url_key";

-- CreateIndex
CREATE UNIQUE INDEX "HttpHost_organizationId_url_key" ON "HttpHost"("organizationId", "url");
