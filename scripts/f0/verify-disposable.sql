\set ON_ERROR_STOP on

SELECT set_config('f0.expected_marker', :'f0_marker', false);

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

  IF database_comment IS DISTINCT FROM
     'agent_ads_f0_disposable:' || current_setting('f0.expected_marker') THEN
    RAISE EXCEPTION 'F0 proof target is missing its server-side disposable marker';
  END IF;

  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    RAISE EXCEPTION 'F0 proof target already contains Prisma migration history';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      AND namespace.nspname NOT IN ('pg_catalog', 'information_schema')
      AND namespace.nspname !~ '^pg_toast'
  ) THEN
    RAISE EXCEPTION 'F0 proof target is not empty';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_database
    WHERE NOT datistemplate
      AND datallowconn
      AND datname NOT IN ('postgres', 'agent_ads_f0')
  ) THEN
    RAISE EXCEPTION 'F0 proof cluster contains an unexpected user database';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname IN ('app_runtime', 'app_secret_broker')
  ) THEN
    RAISE EXCEPTION 'F0 proof cluster already contains application roles';
  END IF;
END
$verification$;
