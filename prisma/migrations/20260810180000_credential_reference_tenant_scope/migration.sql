-- Add organization ownership to existing private credential-reference rows before
-- tightening the private RLS policy. A live database must contain no orphaned
-- references; the guarded failure prevents silently assigning secret metadata.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_secret_broker') THEN
    CREATE ROLE app_secret_broker NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

ALTER TABLE "private"."credential_references"
  ADD COLUMN IF NOT EXISTS "organization_id" UUID;

UPDATE "private"."credential_references" AS reference
SET "organization_id" = connection."organization_id"
FROM "public"."connections" AS connection
WHERE connection."credential_reference_id" = reference."id"
  AND reference."organization_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "private"."credential_references" WHERE "organization_id" IS NULL) THEN
    RAISE EXCEPTION 'credential reference tenant backfill incomplete';
  END IF;
END
$$;

ALTER TABLE "private"."credential_references"
  ALTER COLUMN "organization_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "credential_references_organization_id_idx"
  ON "private"."credential_references"("organization_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'credential_references_organization_id_fkey'
  ) THEN
    ALTER TABLE "private"."credential_references"
      ADD CONSTRAINT "credential_references_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DROP POLICY IF EXISTS credential_references_select ON "private"."credential_references";
DROP POLICY IF EXISTS credential_references_insert ON "private"."credential_references";
DROP POLICY IF EXISTS credential_references_update ON "private"."credential_references";

CREATE POLICY credential_references_select ON "private"."credential_references"
  FOR SELECT TO app_runtime
  USING ("organization_id" = private.current_organization_id());
CREATE POLICY credential_references_insert ON "private"."credential_references"
  FOR INSERT TO app_runtime
  WITH CHECK ("organization_id" = private.current_organization_id());
CREATE POLICY credential_references_update ON "private"."credential_references"
  FOR UPDATE TO app_runtime
  USING ("organization_id" = private.current_organization_id())
  WITH CHECK ("organization_id" = private.current_organization_id());

CREATE OR REPLACE FUNCTION private.read_broker_secret(secret_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, private, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id
$$;

CREATE OR REPLACE FUNCTION private.destroy_broker_secret(secret_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, private, vault
AS $$
  DELETE FROM vault.secrets WHERE id = secret_id
$$;

REVOKE ALL ON FUNCTION private.read_broker_secret(uuid) FROM PUBLIC, anon, authenticated, app_runtime;
REVOKE ALL ON FUNCTION private.destroy_broker_secret(uuid) FROM PUBLIC, anon, authenticated, app_runtime;
GRANT USAGE ON SCHEMA private TO app_secret_broker;
GRANT USAGE ON SCHEMA vault TO app_secret_broker;
GRANT EXECUTE ON FUNCTION private.read_broker_secret(uuid) TO app_secret_broker;
GRANT EXECUTE ON FUNCTION private.destroy_broker_secret(uuid) TO app_secret_broker;
GRANT EXECUTE ON FUNCTION vault.create_secret(text, text, text, uuid) TO app_secret_broker;
GRANT EXECUTE ON FUNCTION vault.update_secret(uuid, text, text, text, uuid) TO app_secret_broker;
