CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 21)
RETURNS text AS $$
DECLARE
  id text := '';
  i int := 0;
  urlAlphabet char(64) := 'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';
  bytes bytea := gen_random_bytes(size);
  byte int;
  pos int;
BEGIN
  WHILE i < size LOOP
    byte := get_byte(bytes, i);
    pos := (byte & 63) + 1; -- + 1 because substr starts at 1 for some reason
    id := id || substr(urlAlphabet, pos, 1);
    i = i + 1;
  END LOOP;
  RETURN id;
END
$$ LANGUAGE PLPGSQL STABLE;

-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "id" SET DEFAULT nanoid();

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "id" SET DEFAULT nanoid();

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT nanoid();

-- AlterTable
ALTER TABLE "UserOrganizationAccess" ALTER COLUMN "id" SET DEFAULT nanoid();
