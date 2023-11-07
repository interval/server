-- CreateTable
CREATE TABLE "OrganizationFeatureFlag" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "organizationId" TEXT NOT NULL,
    "flag" "ConfiguredFeatureFlag" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFeatureFlag_flag_key" ON "OrganizationFeatureFlag"("flag");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFeatureFlag_organizationId_flag_key" ON "OrganizationFeatureFlag"("organizationId", "flag");

-- AddForeignKey
ALTER TABLE "OrganizationFeatureFlag" ADD CONSTRAINT "OrganizationFeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
