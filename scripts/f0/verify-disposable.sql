\set ON_ERROR_STOP on

\connect postgres
SET search_path = pg_catalog, pg_temp;
SELECT pg_catalog.set_config('f0.expected_database', 'postgres', false);
SELECT pg_catalog.set_config('f0.allowed_database', 'agent_ads_f0', false);
\ir disposable-cluster-guard.sql

\connect template1
SET search_path = pg_catalog, pg_temp;
SELECT pg_catalog.set_config('f0.expected_database', 'template1', false);
SELECT pg_catalog.set_config('f0.allowed_database', 'agent_ads_f0', false);
\ir disposable-cluster-guard.sql

\connect agent_ads_f0
SET search_path = pg_catalog, pg_temp;
SELECT pg_catalog.set_config('f0.expected_marker', :'f0_marker', false);
SELECT pg_catalog.set_config('f0.expected_database', 'agent_ads_f0', false);
SELECT pg_catalog.set_config('f0.allowed_database', 'agent_ads_f0', false);
\if :{?f0_mutex_token}
SELECT pg_catalog.set_config(
  'f0.expected_database_marker',
  'agent_ads_f0_running:' || :'f0_marker' || ':' || :'f0_mutex_token',
  false
);
\else
SELECT pg_catalog.set_config(
  'f0.expected_database_marker',
  'agent_ads_f0_disposable:' || :'f0_marker',
  false
);
\endif

\ir disposable-cluster-guard.sql

DO $verification$
DECLARE
  database_comment text;
BEGIN
  IF current_database() <> 'agent_ads_f0' THEN
    RAISE EXCEPTION 'F0 proof target has an unexpected database name';
  END IF;

  SELECT shobj_description(oid, 'pg_database')
  INTO database_comment
  FROM pg_database
  WHERE datname = current_database();

  IF database_comment IS DISTINCT FROM current_setting('f0.expected_database_marker') THEN
    RAISE EXCEPTION 'F0 proof target is missing its server-side disposable marker';
  END IF;
END
$verification$;
