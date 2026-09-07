-- Run only in an empty, disposable PostgreSQL database.
\set ON_ERROR_STOP on
CREATE SCHEMA private;
CREATE TABLE private.rate_limit_buckets (
  key_hash text PRIMARY KEY, organization_id uuid,
  window_started_at timestamptz NOT NULL, hit_count integer NOT NULL,
  expires_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
\ir ../prisma/migrations/20260907230000_fix_rate_limit_clock/migration.sql

DO $$
DECLARE
  outcome record;
BEGIN
  SELECT * INTO outcome FROM private.consume_rate_limit(repeat('a',64), 1, 60);
  IF NOT outcome.allowed OR outcome.retry_after_seconds NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'FIRST_REQUEST_FAILED';
  END IF;
  SELECT * INTO outcome FROM private.consume_rate_limit(repeat('a',64), 1, 60);
  IF outcome.allowed THEN RAISE EXCEPTION 'LIMIT_NOT_ENFORCED'; END IF;

  UPDATE private.rate_limit_buckets SET expires_at = clock_timestamp() - interval '1 second';
  SELECT * INTO outcome FROM private.consume_rate_limit(repeat('a',64), 1, 60);
  IF NOT outcome.allowed THEN RAISE EXCEPTION 'WINDOW_NOT_RESET'; END IF;
  IF (SELECT hit_count FROM private.rate_limit_buckets WHERE key_hash = repeat('a',64)) <> 1 THEN
    RAISE EXCEPTION 'COUNT_NOT_RESET';
  END IF;

  INSERT INTO private.rate_limit_buckets VALUES (
    repeat('b',64), NULL, clock_timestamp() - interval '3 days', 1,
    clock_timestamp() - interval '2 days', clock_timestamp() - interval '3 days'
  );
  PERFORM private.consume_rate_limit(repeat('c',64), 1, 60);
  IF EXISTS (SELECT 1 FROM private.rate_limit_buckets WHERE key_hash = repeat('b',64)) THEN
    RAISE EXCEPTION 'STALE_BUCKET_NOT_REMOVED';
  END IF;
  BEGIN
    PERFORM private.consume_rate_limit(repeat('a',64), 0, 60);
    RAISE EXCEPTION 'INVALID_LIMIT_ACCEPTED';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END;
$$;
SELECT 'RATE_LIMIT_CLOCK_REGRESSION_PASSED' AS result;
