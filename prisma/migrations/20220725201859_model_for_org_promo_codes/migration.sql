-- CreateTable
CREATE TABLE "OrganizationPromoCode" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "OrganizationPromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPromoCode_code_key" ON "OrganizationPromoCode"("code");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_promoCode_fkey" FOREIGN KEY ("promoCode") REFERENCES "OrganizationPromoCode"("code") ON DELETE SET NULL ON UPDATE CASCADE;
