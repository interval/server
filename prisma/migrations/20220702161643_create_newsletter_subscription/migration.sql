-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "email" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_userId_key" ON "NewsletterSubscription"("userId");

-- AddForeignKey
ALTER TABLE "NewsletterSubscription" ADD CONSTRAINT "NewsletterSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate opted in users to NewsletterSubscription table
WITH optIns AS (
    SELECT "id", "createdAt"
    FROM "User"
    WHERE "optIntoCommunications" = true
)
INSERT INTO "NewsletterSubscription" ("userId", "createdAt")
SELECT * FROM optIns;