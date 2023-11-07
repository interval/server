-- CreateTable
CREATE TABLE "ActionGroup" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "developerId" TEXT,

    CONSTRAINT "ActionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionGroup_slug_organizationId_developerId_key" ON "ActionGroup"("slug", "organizationId", "developerId");

-- AddForeignKey
ALTER TABLE "ActionGroup" ADD CONSTRAINT "ActionGroup_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionGroup" ADD CONSTRAINT "ActionGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
