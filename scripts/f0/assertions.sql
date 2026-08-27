\set ON_ERROR_STOP on

DO $assertions$
DECLARE
  mismatched_foreign_key text;
BEGIN
  IF (
    SELECT attribute.atttypid::regtype::text
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.connections'::regclass
      AND attribute.attname = 'credential_reference_id'
      AND NOT attribute.attisdropped
  ) IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'connections.credential_reference_id is not uuid';
  END IF;

  IF (
    SELECT attribute.atttypid::regtype::text
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'private.credential_references'::regclass
      AND attribute.attname = 'id'
      AND NOT attribute.attisdropped
  ) IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'credential_references.id is not uuid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_definition
    WHERE constraint_definition.conname = 'connections_organization_credential_fkey'
      AND constraint_definition.conrelid = 'public.connections'::regclass
      AND constraint_definition.confrelid = 'private.credential_references'::regclass
      AND constraint_definition.contype = 'f'
      AND constraint_definition.convalidated
      AND constraint_definition.confupdtype = 'c'
      AND constraint_definition.confdeltype = 'r'
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(constraint_definition.conkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_definition.conrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'credential_reference_id']
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(constraint_definition.confkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_definition.confrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'id']
  ) THEN
    RAISE EXCEPTION 'tenant credential foreign key has an unexpected definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_definition
    WHERE constraint_definition.conname = 'connections_credential_owner_fkey'
      AND constraint_definition.conrelid = 'public.connections'::regclass
      AND constraint_definition.confrelid = 'private.credential_references'::regclass
      AND constraint_definition.contype = 'f'
      AND constraint_definition.convalidated
      AND constraint_definition.confupdtype = 'c'
      AND constraint_definition.confdeltype = 'r'
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(constraint_definition.conkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_definition.conrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'id', 'credential_reference_id']
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(constraint_definition.confkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_definition.confrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'connection_id', 'id']
  ) THEN
    RAISE EXCEPTION 'credential owner foreign key has an unexpected definition';
  END IF;

  SELECT constraint_definition.conname
  INTO mismatched_foreign_key
  FROM pg_constraint AS constraint_definition
  CROSS JOIN LATERAL unnest(constraint_definition.conkey) WITH ORDINALITY AS source_key(attnum, position)
  JOIN LATERAL unnest(constraint_definition.confkey) WITH ORDINALITY AS target_key(attnum, position)
    ON target_key.position = source_key.position
  JOIN pg_attribute AS source_attribute
    ON source_attribute.attrelid = constraint_definition.conrelid
   AND source_attribute.attnum = source_key.attnum
  JOIN pg_attribute AS target_attribute
    ON target_attribute.attrelid = constraint_definition.confrelid
   AND target_attribute.attnum = target_key.attnum
  WHERE constraint_definition.contype = 'f'
    AND constraint_definition.connamespace IN ('public'::regnamespace, 'private'::regnamespace)
    AND source_attribute.atttypid <> target_attribute.atttypid
  LIMIT 1;

  IF mismatched_foreign_key IS NOT NULL THEN
    RAISE EXCEPTION 'foreign key % uses incompatible column types', mismatched_foreign_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS index_definition
    WHERE index_definition.indexrelid = 'public.connections_organization_id_credential_reference_id_idx'::regclass
      AND index_definition.indrelid = 'public.connections'::regclass
      AND index_definition.indisvalid
      AND index_definition.indisready
      AND NOT index_definition.indisunique
      AND index_definition.indpred IS NULL
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(index_definition.indkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = index_definition.indrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'credential_reference_id']
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_index AS index_definition
    WHERE index_definition.indexrelid = 'private.credential_references_organization_id_connection_id_id_key'::regclass
      AND index_definition.indrelid = 'private.credential_references'::regclass
      AND index_definition.indisvalid
      AND index_definition.indisready
      AND index_definition.indisunique
      AND index_definition.indpred IS NULL
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(index_definition.indkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = index_definition.indrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'connection_id', 'id']
  ) THEN
    RAISE EXCEPTION 'credential relationship supporting index has an unexpected definition';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('public', 'organizations'),
      ('public', 'users'),
      ('public', 'memberships'),
      ('public', 'organization_invitations'),
      ('public', 'connection_requests'),
      ('public', 'connections'),
      ('public', 'connection_resources'),
      ('public', 'capability_snapshots'),
      ('public', 'connection_health_checks'),
      ('public', 'oauth_transactions'),
      ('public', 'access_invitations'),
      ('public', 'audit_events'),
      ('public', 'onboarding_submissions'),
      ('private', 'step_up_grants'),
      ('private', 'credential_references'),
      ('private', 'rate_limit_buckets'),
      ('private', 'idempotency_records')
    ) AS expected(schema_name, table_name)
    LEFT JOIN pg_namespace AS namespace
      ON namespace.nspname = expected.schema_name
    LEFT JOIN pg_class AS relation
      ON relation.relnamespace = namespace.oid
     AND relation.relname = expected.table_name
     AND relation.relkind IN ('r', 'p')
    WHERE relation.oid IS NULL
       OR NOT relation.relrowsecurity
       OR NOT relation.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'a protected application table is missing enabled and forced RLS';
  END IF;

  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('app_runtime', 'app_secret_broker')) <> 2 THEN
    RAISE EXCEPTION 'required application database role is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname IN ('app_runtime', 'app_secret_broker')
      AND (
        rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR
        rolreplication OR rolbypassrls OR rolcanlogin
      )
  ) THEN
    RAISE EXCEPTION 'application database role has elevated privileges';
  END IF;

  IF NOT has_table_privilege('app_runtime', 'public.connections', 'SELECT')
     OR NOT has_table_privilege('app_runtime', 'private.credential_references', 'SELECT')
     OR has_table_privilege('app_runtime', 'private.credential_references', 'DELETE')
     OR has_table_privilege('app_runtime', 'vault.secrets', 'SELECT')
     OR has_table_privilege('app_runtime', 'vault.decrypted_secrets', 'SELECT')
     OR has_table_privilege('app_secret_broker', 'public.connections', 'SELECT')
     OR has_table_privilege('app_secret_broker', 'private.credential_references', 'SELECT')
     OR has_table_privilege('app_secret_broker', 'vault.secrets', 'SELECT')
     OR has_table_privilege('app_secret_broker', 'vault.decrypted_secrets', 'SELECT') THEN
    RAISE EXCEPTION 'application role table privileges do not match the allowlist';
  END IF;

  IF NOT has_function_privilege('app_secret_broker', 'private.read_broker_secret(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('app_secret_broker', 'private.destroy_broker_secret(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('app_secret_broker', 'vault.create_secret(text,text,text,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('app_secret_broker', 'vault.update_secret(uuid,text,text,text,uuid)', 'EXECUTE')
     OR has_function_privilege('app_runtime', 'private.read_broker_secret(uuid)', 'EXECUTE')
     OR has_function_privilege('app_runtime', 'private.destroy_broker_secret(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'application role function privileges do not match the allowlist';
  END IF;
END
$assertions$;

BEGIN;

DO $ownership_proof$
DECLARE
  organization_id constant uuid := '00000000-0000-4000-8000-000000000100';
  user_id constant uuid := '00000000-0000-4000-8000-000000000101';
  connection_a constant uuid := '00000000-0000-4000-8000-000000000201';
  connection_b constant uuid := '00000000-0000-4000-8000-000000000202';
  reference_b constant uuid := '00000000-0000-4000-8000-000000000301';
BEGIN
  INSERT INTO public.organizations (id, name, slug, updated_at)
  VALUES (organization_id, 'F0 proof', 'f0-proof', now());

  INSERT INTO public.users (id, auth_subject, updated_at)
  VALUES (user_id, '00000000-0000-4000-8000-000000000102', now());

  INSERT INTO public.connections (
    id, organization_id, created_by_user_id, provider, authorization_method,
    granted_scopes, updated_at
  ) VALUES
    (connection_a, organization_id, user_id, 'mock', 'oauth', ARRAY[]::text[], now()),
    (connection_b, organization_id, user_id, 'mock', 'oauth', ARRAY[]::text[], now());

  INSERT INTO private.credential_references (
    id, organization_id, connection_id, broker_handle, backend,
    credential_kind, key_version, updated_at
  ) VALUES (
    reference_b, organization_id, connection_b, 'f0-proof-handle', 'proof',
    'oauth_refresh_token', 'proof-v1', now()
  );

  BEGIN
    UPDATE public.connections
    SET credential_reference_id = reference_b
    WHERE id = connection_a;
    RAISE EXCEPTION 'same-tenant cross-connection credential pointer was accepted';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;

  UPDATE public.connections
  SET credential_reference_id = reference_b
  WHERE id = connection_b;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'valid credential owner pointer was rejected';
  END IF;
END
$ownership_proof$;

ROLLBACK;
