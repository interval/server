-- CreateTable
CREATE TABLE "UserOrganizationInvitation" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissions" "UserAccessPermission"[],

    CONSTRAINT "UserOrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserOrganizationInvitation" ADD CONSTRAINT "UserOrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
