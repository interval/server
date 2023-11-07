/*
  Warnings:

  - You are about to drop the column `hostInstanceId` on the `Action` table. All the data in the column will be lost.
  - You are about to drop the column `httpHostId` on the `Action` table. All the data in the column will be lost.

*/

-- CreateTable
CREATE TABLE "_ActionToHostInstance" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ActionToHttpHost" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ActionToHostInstance_AB_unique" ON "_ActionToHostInstance"("A", "B");

-- CreateIndex
CREATE INDEX "_ActionToHostInstance_B_index" ON "_ActionToHostInstance"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ActionToHttpHost_AB_unique" ON "_ActionToHttpHost"("A", "B");

-- CreateIndex
CREATE INDEX "_ActionToHttpHost_B_index" ON "_ActionToHttpHost"("B");

-- AddForeignKey
ALTER TABLE "_ActionToHostInstance" ADD FOREIGN KEY ("A") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionToHostInstance" ADD FOREIGN KEY ("B") REFERENCES "HostInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionToHttpHost" ADD FOREIGN KEY ("A") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionToHttpHost" ADD FOREIGN KEY ("B") REFERENCES "HttpHost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH host_instances as (
    SELECT id, "hostInstanceId"
    FROM "Action"
    WHERE "hostInstanceId" IS NOT NULL
)
INSERT INTO "_ActionToHostInstance" ("A", "B")
SELECT * from host_instances;

WITH http_hosts as (
    SELECT id, "httpHostId"
    FROM "Action"
    WHERE "httpHostId" IS NOT NULL
)
INSERT INTO "_ActionToHttpHost" ("A", "B")
SELECT * from http_hosts;

-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_hostInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_httpHostId_fkey";

-- AlterTable
ALTER TABLE "Action" DROP COLUMN "hostInstanceId",
DROP COLUMN "httpHostId";
