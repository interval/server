-- CreateTable
CREATE TABLE "ActionGroupAccess" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "actionGroupMetadataId" TEXT NOT NULL,
    "userAccessGroupId" TEXT NOT NULL,
    "level" "ActionAccessLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionGroupAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionGroupMetadata" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "availability" "ActionAvailability" NOT NULL DEFAULT E'ORGANIZATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionGroupId" TEXT NOT NULL,

    CONSTRAINT "ActionGroupMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionGroupAccess_actionGroupMetadataId_userAccessGroupId_key" ON "ActionGroupAccess"("actionGroupMetadataId", "userAccessGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionGroupMetadata_actionGroupId_key" ON "ActionGroupMetadata"("actionGroupId");

-- AddForeignKey
ALTER TABLE "ActionGroupAccess" ADD CONSTRAINT "ActionGroupAccess_userAccessGroupId_fkey" FOREIGN KEY ("userAccessGroupId") REFERENCES "UserAccessGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionGroupAccess" ADD CONSTRAINT "ActionGroupAccess_actionGroupMetadataId_fkey" FOREIGN KEY ("actionGroupMetadataId") REFERENCES "ActionGroupMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionGroupMetadata" ADD CONSTRAINT "ActionGroupMetadata_actionGroupId_fkey" FOREIGN KEY ("actionGroupId") REFERENCES "ActionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
