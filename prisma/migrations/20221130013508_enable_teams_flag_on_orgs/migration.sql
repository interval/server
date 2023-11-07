-- Enable teams for organizations who are already using them 
WITH teamsOrgs AS (
  SELECT "organizationId" FROM "UserAccessGroup" grp GROUP BY "organizationId"
)
INSERT INTO "OrganizationFeatureFlag" ("organizationId", "flag", "enabled")
SELECT "organizationId", 'CREATE_TWO_TEAMS', true FROM teamsOrgs;
