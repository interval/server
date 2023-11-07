WITH orgs AS (
	SELECT id, 'ACTION_METADATA_GENERAL_CONFIG'::"ConfiguredFeatureFlag" as "flag", true as "enabled"
	FROM "Organization"
)
INSERT INTO "OrganizationFeatureFlag" ("organizationId", "flag", "enabled")
SELECT * FROM orgs;
