\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-4000-8000-000000001001'),
  ('00000000-0000-4000-8000-000000001002');

INSERT INTO auth.sessions (id, user_id) VALUES
  ('00000000-0000-4000-8000-000000001011', '00000000-0000-4000-8000-000000001001'),
  ('00000000-0000-4000-8000-000000001012', '00000000-0000-4000-8000-000000001002');

INSERT INTO public.organizations (id, name, slug, updated_at) VALUES
  ('00000000-0000-4000-8000-000000001101', 'F0 tenant A', 'f0-tenant-a', now()),
  ('00000000-0000-4000-8000-000000001102', 'F0 tenant B', 'f0-tenant-b', now());

INSERT INTO public.users (id, auth_subject, updated_at) VALUES
  ('00000000-0000-4000-8000-000000001201', '00000000-0000-4000-8000-000000001001', now()),
  ('00000000-0000-4000-8000-000000001202', '00000000-0000-4000-8000-000000001002', now());

INSERT INTO public.connections (
  id, organization_id, created_by_user_id, provider, authorization_method,
  granted_scopes, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000001301', '00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000001201', 'mock', 'oauth', ARRAY[]::text[], now()),
  ('00000000-0000-4000-8000-000000001302', '00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-000000001202', 'mock', 'oauth', ARRAY[]::text[], now());

INSERT INTO private.credential_references (
  id, organization_id, connection_id, broker_handle, backend,
  credential_kind, key_version, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000001301', 'f0-tenant-a-handle', 'proof', 'oauth_refresh_token', 'proof-v1', now()),
  ('00000000-0000-4000-8000-000000001402', '00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-000000001302', 'f0-tenant-b-handle', 'proof', 'oauth_refresh_token', 'proof-v1', now());

COMMIT;

BEGIN;
SET LOCAL ROLE app_runtime;

DO $missing_context$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.organizations;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'app_runtime can read organizations without tenant context';
  END IF;

  SELECT count(*) INTO visible_rows FROM public.users;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'app_runtime can read users without auth-subject context';
  END IF;

  SELECT count(*) INTO visible_rows FROM private.credential_references;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'app_runtime can read credential references without tenant context';
  END IF;
END
$missing_context$;

COMMIT;

BEGIN;
SELECT set_config('app.current_organization_id', '00000000-0000-4000-8000-000000001101', true);
SELECT set_config('app.current_auth_subject', '00000000-0000-4000-8000-000000001001', true);
SELECT set_config('app.current_session_id', '00000000-0000-4000-8000-000000001011', true);
SET LOCAL ROLE app_runtime;

DO $tenant_a$
DECLARE
  visible_rows integer;
  changed_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.organizations
  WHERE id = '00000000-0000-4000-8000-000000001101';
  IF visible_rows <> 1 OR (SELECT count(*) FROM public.organizations) <> 1 THEN
    RAISE EXCEPTION 'app_runtime tenant A organization isolation failed';
  END IF;

  SELECT count(*) INTO visible_rows
  FROM public.users
  WHERE auth_subject = '00000000-0000-4000-8000-000000001001';
  IF visible_rows <> 1 OR (SELECT count(*) FROM public.users) <> 1 THEN
    RAISE EXCEPTION 'app_runtime auth-subject isolation failed';
  END IF;

  SELECT count(*) INTO visible_rows
  FROM private.credential_references
  WHERE id = '00000000-0000-4000-8000-000000001401';
  IF visible_rows <> 1 OR (SELECT count(*) FROM private.credential_references) <> 1 THEN
    RAISE EXCEPTION 'app_runtime credential-reference isolation failed';
  END IF;

  IF NOT private.is_active_auth_session(
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000001011'
  ) THEN
    RAISE EXCEPTION 'active application session was rejected';
  END IF;

  UPDATE public.organizations
  SET name = 'blocked cross-tenant update'
  WHERE id = '00000000-0000-4000-8000-000000001102';
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 0 THEN
    RAISE EXCEPTION 'app_runtime updated another tenant';
  END IF;

  BEGIN
    INSERT INTO private.credential_references (
      id, organization_id, connection_id, broker_handle, backend,
      credential_kind, key_version, updated_at
    ) VALUES (
      '00000000-0000-4000-8000-000000001499',
      '00000000-0000-4000-8000-000000001102',
      '00000000-0000-4000-8000-000000001302',
      'f0-cross-tenant-handle', 'proof', 'oauth_refresh_token', 'proof-v1', now()
    );
    RAISE EXCEPTION 'app_runtime inserted another tenant credential reference';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END
$tenant_a$;

COMMIT;

BEGIN;
SET LOCAL ROLE app_runtime;

DO $context_reset$
BEGIN
  IF private.current_organization_id() IS NOT NULL
     OR private.current_auth_subject() IS NOT NULL THEN
    RAISE EXCEPTION 'transaction-local application context leaked into a new transaction';
  END IF;
END
$context_reset$;

COMMIT;

DELETE FROM auth.sessions
WHERE id = '00000000-0000-4000-8000-000000001011';

BEGIN;
SET LOCAL ROLE app_runtime;

DO $revoked_session$
BEGIN
  IF private.is_active_auth_session(
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000001011'
  ) THEN
    RAISE EXCEPTION 'removed application session remained active';
  END IF;
END
$revoked_session$;

COMMIT;

BEGIN;
DELETE FROM private.credential_references
WHERE id IN (
  '00000000-0000-4000-8000-000000001401',
  '00000000-0000-4000-8000-000000001402'
);
DELETE FROM public.connections
WHERE id IN (
  '00000000-0000-4000-8000-000000001301',
  '00000000-0000-4000-8000-000000001302'
);
DELETE FROM public.organizations
WHERE id IN (
  '00000000-0000-4000-8000-000000001101',
  '00000000-0000-4000-8000-000000001102'
);
DELETE FROM public.users
WHERE id IN (
  '00000000-0000-4000-8000-000000001201',
  '00000000-0000-4000-8000-000000001202'
);
DELETE FROM auth.sessions
WHERE id = '00000000-0000-4000-8000-000000001012';
DELETE FROM auth.users
WHERE id IN (
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-000000001002'
);
COMMIT;
