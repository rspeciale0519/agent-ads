BEGIN;

SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- Restore protections owned by earlier migrations without rewriting their history.
-- The limiter has no table policy. Its trusted definer must still bypass RLS.
DO $security_contract_preconditions$
BEGIN
  IF (
    SELECT count(*)
    FROM pg_roles
    WHERE rolname IN ('app_runtime', 'app_secret_broker')
      AND NOT (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole
        OR rolreplication OR rolbypassrls)
  ) <> 2 THEN
    RAISE EXCEPTION 'ACCOUNT_CONNECTIONS_PERMISSION_ROLE_CONTRACT_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_language l ON l.oid = p.prolang
    JOIN pg_roles owner_role ON owner_role.oid = p.proowner
    JOIN pg_class c ON c.oid = to_regclass('private.rate_limit_buckets')
    WHERE p.oid = to_regprocedure('private.consume_rate_limit(text,integer,integer,uuid)')
      AND p.prosecdef
      AND l.lanname = 'plpgsql'
      AND p.proconfig = ARRAY['search_path=pg_catalog, private']
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND p.proowner = c.relowner
      AND (owner_role.rolsuper OR owner_role.rolbypassrls)
      AND owner_role.rolname NOT IN (
        'app_runtime', 'app_secret_broker', 'anon', 'authenticated', 'service_role'
      )
      AND has_schema_privilege(p.proowner, 'private', 'USAGE')
      AND has_table_privilege(p.proowner, c.oid, 'SELECT')
      AND has_table_privilege(p.proowner, c.oid, 'INSERT')
      AND has_table_privilege(p.proowner, c.oid, 'UPDATE')
      AND has_table_privilege(p.proowner, c.oid, 'DELETE')
      AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = c.oid)
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_CONNECTIONS_RATE_LIMIT_DEFINER_CONTRACT_INVALID';
  END IF;
END
$security_contract_preconditions$;

ALTER TABLE private.rate_limit_buckets FORCE ROW LEVEL SECURITY;

-- Environment-specific login memberships remain controlled maintenance work.
-- This repair changes neither those logins nor direct Vault relation grants.
REVOKE EXECUTE ON FUNCTION vault.create_secret(text, text, text, uuid) FROM service_role RESTRICT;
REVOKE EXECUTE ON FUNCTION vault.update_secret(uuid, text, text, text, uuid) FROM service_role RESTRICT;

-- An inherited or PUBLIC grant must not turn a partial repair into a success.
-- A failure rolls back this transaction, including the FORCE setting above.
DO $security_contract_postconditions$
DECLARE
  signature text;
  denied_role text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = to_regclass('private.rate_limit_buckets')
      AND relrowsecurity AND relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_CONNECTIONS_RATE_LIMIT_RLS_REPAIR_FAILED';
  END IF;

  FOREACH signature IN ARRAY ARRAY[
    'vault.create_secret(text,text,text,uuid)',
    'vault.update_secret(uuid,text,text,text,uuid)'
  ] LOOP
    IF has_function_privilege('app_secret_broker', to_regprocedure(signature), 'EXECUTE')
      IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'ACCOUNT_CONNECTIONS_BROKER_EXECUTE_CONTRACT_INVALID';
    END IF;

    FOREACH denied_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'app_runtime'] LOOP
      IF has_function_privilege(denied_role::name, to_regprocedure(signature), 'EXECUTE')
        IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'ACCOUNT_CONNECTIONS_VAULT_EXECUTE_REPAIR_FAILED';
      END IF;
    END LOOP;
  END LOOP;
END
$security_contract_postconditions$;

COMMIT;
