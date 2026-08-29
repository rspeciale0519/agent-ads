-- PostgreSQL does not let CREATE OR REPLACE FUNCTION rename an input
-- parameter. Drop only the known older signature before the next migration
-- recreates it with the identity-bound parameter name.
BEGIN;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'private'
      AND procedure.proname = 'list_user_organizations'
      AND pg_get_function_identity_arguments(procedure.oid) = 'auth_subject uuid'
  ) THEN
    DROP FUNCTION private.list_user_organizations(uuid);
  END IF;
END
$migration$;

COMMIT;
