/*
  Warnings:

  - Made the column `organizationEnvironmentId` on table `Action` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationEnvironmentId` on table `ActionGroup` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationEnvironmentId` on table `ActionMetadata` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationEnvironmentId` on table `ApiKey` required. This step will fail if there are existing NULL values in that column.

*/


WITH orgs_without_prod_env AS (
	SELECT id AS "organizationId", NULL AS slug, 'Production' as "name", current_timestamp AS "createdAt", current_timestamp AS "updatedAt"
	FROM "Organization"
	WHERE NOT EXISTS (
		SELECT 1 FROM "OrganizationEnvironment" env
		WHERE env."organizationId" = "Organization".id
			AND env.slug IS NULL
	)
)
INSERT INTO "OrganizationEnvironment" ("organizationId", "slug", "name", "createdAt", "updatedAt")
SELECT *
FROM orgs_without_prod_env;

WITH orgs_without_dev_env AS (
	SELECT id AS "organizationId", 'development' AS slug, 'Development' as "name", current_timestamp AS "createdAt", current_timestamp AS "updatedAt", 'orange' AS "color"
	FROM "Organization"
	WHERE NOT EXISTS (
		SELECT 1 FROM "OrganizationEnvironment" env
		WHERE env."organizationId" = "Organization".id
			AND env.slug = 'development'
	)
)
INSERT INTO "OrganizationEnvironment" ("organizationId", "slug", "name", "createdAt", "updatedAt", "color")
SELECT *
FROM orgs_without_dev_env;


-- ApiKey
WITH prod_envs AS (
	SELECT "organizationId", id, "slug"
	FROM "OrganizationEnvironment"
	WHERE slug IS NULL
)
UPDATE "ApiKey" SET "organizationEnvironmentId" = prod_envs.id
FROM prod_envs
WHERE prod_envs."organizationId" = "ApiKey"."organizationId"
	AND "ApiKey"."usageEnvironment" = 'PRODUCTION'
	AND "ApiKey"."organizationEnvironmentId" IS NULL;


WITH dev_envs AS (
	SELECT "organizationId", id, "slug"
	FROM "OrganizationEnvironment"
	WHERE slug = 'development'
)
UPDATE "ApiKey" SET "organizationEnvironmentId" = dev_envs.id
FROM dev_envs
WHERE dev_envs."organizationId" = "ApiKey"."organizationId"
	AND "ApiKey"."usageEnvironment" = 'DEVELOPMENT'
	AND "ApiKey"."organizationEnvironmentId" IS NULL;

-- Action
DELETE FROM "Action" WHERE "organizationEnvironmentId" in (
	SELECT id
	FROM "OrganizationEnvironment"
	WHERE slug IS NULL OR slug = 'development'
);

WITH prod_envs AS (
	SELECT "organizationId", id, "slug"
	FROM "OrganizationEnvironment"
	WHERE slug IS NULL
)
UPDATE "Action" a SET "organizationEnvironmentId" = prod_envs.id
FROM prod_envs
WHERE prod_envs."organizationId" = a."organizationId"
	AND a."developerId" IS NULL
	AND a."organizationEnvironmentId" IS NULL;

WITH dev_envs AS (
	SELECT "organizationId", id, "slug"
	FROM "OrganizationEnvironment"
	WHERE slug = 'development'
)
UPDATE "Action" a SET "organizationEnvironmentId" = dev_envs.id
FROM dev_envs
WHERE dev_envs."organizationId" = a."organizationId"
	AND a."developerId" IS NOT NULL
	AND a."organizationEnvironmentId" IS NULL;

-- ActionGroup
DELETE FROM "ActionGroup" WHERE "organizationEnvironmentId" in (
	SELECT id
	FROM "OrganizationEnvironment"
	WHERE slug IS NULL OR slug = 'development'
);
WITH prod_envs AS (
	SELECT "organizationId", id, "slug"
	FROM "OrganizationEnvironment"
	WHERE slug IS NULL
)
UPDATE "ActionGroup" a SET "organizationEnvironmentId" = prod_envs.id
FROM prod_envs
WHERE prod_envs."organizationId" = a."organizationId"
	AND a."developerId" IS NULL
	AND a."organizationEnvironmentId" IS NULL;

WITH dev_envs AS (
	SELECT "organizationId", id, "slug"
	FROM "OrganizationEnvironment"
	WHERE slug = 'development'
)
UPDATE "ActionGroup" a SET "organizationEnvironmentId" = dev_envs.id
FROM dev_envs
WHERE dev_envs."organizationId" = a."organizationId"
	AND a."developerId" IS NOT NULL
	AND a."organizationEnvironmentId" IS NULL;

-- ActionMetadata
DELETE FROM "ActionMetadata" WHERE "organizationEnvironmentId" in (
	SELECT id
	FROM "OrganizationEnvironment"
	WHERE slug IS NULL OR slug = 'development'
);
WITH prod_envs AS (
	SELECT "organizationId", id, "slug"
	FROM "OrganizationEnvironment"
	WHERE slug IS NULL
)
UPDATE "ActionMetadata" a SET "organizationEnvironmentId" = prod_envs.id
FROM prod_envs
WHERE prod_envs."organizationId" = a."organizationId"
	AND a."organizationEnvironmentId" IS NULL;

-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_organizationEnvironmentId_fkey";

-- DropForeignKey
ALTER TABLE "ActionGroup" DROP CONSTRAINT "ActionGroup_organizationEnvironmentId_fkey";

-- DropForeignKey
ALTER TABLE "ActionMetadata" DROP CONSTRAINT "ActionMetadata_organizationEnvironmentId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_organizationEnvironmentId_fkey";

DROP INDEX "Action_slug_organizationId_null_orgEnv_devId_key";
DROP INDEX "Action_slug_organizationId_devId_null_orgEnv_key";
DROP INDEX "ActionGroup_slug_organizationId_null_orgEnv_devId_key";
DROP INDEX "ActionGroup_slug_organizationId_devId_null_orgEnv_key";

-- AlterTable
ALTER TABLE "Action" ALTER COLUMN "organizationEnvironmentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ActionGroup" ALTER COLUMN "organizationEnvironmentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ActionMetadata" ALTER COLUMN "organizationEnvironmentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "organizationEnvironmentId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationEnvironmentId_fkey" FOREIGN KEY ("organizationEnvironmentId") REFERENCES "OrganizationEnvironment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_organizationEnvironmentId_fkey" FOREIGN KEY ("organizationEnvironmentId") REFERENCES "OrganizationEnvironment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionGroup" ADD CONSTRAINT "ActionGroup_organizationEnvironmentId_fkey" FOREIGN KEY ("organizationEnvironmentId") REFERENCES "OrganizationEnvironment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionMetadata" ADD CONSTRAINT "ActionMetadata_organizationEnvironmentId_fkey" FOREIGN KEY ("organizationEnvironmentId") REFERENCES "OrganizationEnvironment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
