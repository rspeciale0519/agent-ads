BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- Keep the existing function owner and grants; only replace its implementation.
CREATE OR REPLACE FUNCTION private.consume_rate_limit(
  rate_key_hash text, max_hits integer, window_seconds integer,
  tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  observed_at timestamptz := clock_timestamp();
  current_count integer;
  current_expiry timestamptz;
BEGIN
  IF rate_key_hash !~ '^[a-f0-9]{64}$' OR max_hits < 1 OR max_hits > 10000 OR window_seconds < 1 OR window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit parameters' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.rate_limit_buckets AS bucket (
    key_hash, organization_id, window_started_at, hit_count, expires_at, updated_at
  ) VALUES (
    rate_key_hash, tenant_id, observed_at, 1,
    observed_at + make_interval(secs => window_seconds), observed_at
  )
  ON CONFLICT (key_hash) DO UPDATE SET
    organization_id = COALESCE(EXCLUDED.organization_id, bucket.organization_id),
    window_started_at = CASE WHEN bucket.expires_at <= observed_at THEN observed_at ELSE bucket.window_started_at END,
    hit_count = CASE WHEN bucket.expires_at <= observed_at THEN 1 ELSE bucket.hit_count + 1 END,
    expires_at = CASE WHEN bucket.expires_at <= observed_at THEN observed_at + make_interval(secs => window_seconds) ELSE bucket.expires_at END,
    updated_at = observed_at
  RETURNING hit_count, expires_at INTO current_count, current_expiry;

  DELETE FROM private.rate_limit_buckets
  WHERE key_hash IN (
    SELECT stale.key_hash FROM private.rate_limit_buckets AS stale
    WHERE stale.expires_at < observed_at - interval '1 day'
    ORDER BY stale.expires_at LIMIT 100
  );

  allowed := current_count <= max_hits;
  retry_after_seconds := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_expiry - observed_at)))::integer);
  RETURN NEXT;
END;
$$;

COMMIT;
