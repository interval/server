-- AlterTable
ALTER TABLE "ActionGroup" ADD COLUMN     "description" TEXT,
ADD COLUMN     "hasRenderer" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_ActionGroupToHostInstance" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ActionGroupToHttpHost" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ActionGroupToHostInstance_AB_unique" ON "_ActionGroupToHostInstance"("A", "B");

-- CreateIndex
CREATE INDEX "_ActionGroupToHostInstance_B_index" ON "_ActionGroupToHostInstance"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ActionGroupToHttpHost_AB_unique" ON "_ActionGroupToHttpHost"("A", "B");

-- CreateIndex
CREATE INDEX "_ActionGroupToHttpHost_B_index" ON "_ActionGroupToHttpHost"("B");

-- AddForeignKey
ALTER TABLE "_ActionGroupToHostInstance" ADD FOREIGN KEY ("A") REFERENCES "ActionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionGroupToHostInstance" ADD FOREIGN KEY ("B") REFERENCES "HostInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionGroupToHttpHost" ADD FOREIGN KEY ("A") REFERENCES "ActionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionGroupToHttpHost" ADD FOREIGN KEY ("B") REFERENCES "HttpHost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
