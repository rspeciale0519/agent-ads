ALTER TABLE public.capability_snapshots
  ADD COLUMN IF NOT EXISTS evidence_source text,
  ADD COLUMN IF NOT EXISTS source_date timestamptz,
  DROP CONSTRAINT IF EXISTS capability_snapshots_role_evidence_check,
  ADD CONSTRAINT capability_snapshots_role_evidence_check
    CHECK (
      capability_key <> 'read_only_role'
      OR support_level <> 'confirmed'
      OR (evidence_source IS NOT NULL AND source_date IS NOT NULL)
    );

CREATE TABLE IF NOT EXISTS private.rate_limit_buckets (
  key_hash text PRIMARY KEY,
  organization_id uuid,
  window_started_at timestamptz NOT NULL,
  hit_count integer NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limit_buckets_key_hash_check CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT rate_limit_buckets_hit_count_check CHECK (hit_count > 0),
  CONSTRAINT rate_limit_buckets_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS rate_limit_buckets_expires_at_idx
  ON private.rate_limit_buckets (expires_at);

CREATE INDEX IF NOT EXISTS rate_limit_buckets_organization_id_idx
  ON private.rate_limit_buckets (organization_id);

-- PostgreSQL does not create indexes for foreign-key columns. These indexes
-- cover the remaining direct parent checks that are not already satisfied by
-- a leftmost organization/relationship index.
CREATE INDEX IF NOT EXISTS organization_invitations_inviter_user_id_idx
  ON public.organization_invitations (inviter_user_id);
CREATE INDEX IF NOT EXISTS organization_invitations_accepted_by_user_id_idx
  ON public.organization_invitations (accepted_by_user_id);
CREATE INDEX IF NOT EXISTS connection_requests_created_by_user_id_idx
  ON public.connection_requests (created_by_user_id);
CREATE INDEX IF NOT EXISTS connection_requests_updated_by_user_id_idx
  ON public.connection_requests (updated_by_user_id);
CREATE INDEX IF NOT EXISTS connections_request_id_idx
  ON public.connections (request_id);
CREATE INDEX IF NOT EXISTS connections_created_by_user_id_idx
  ON public.connections (created_by_user_id);
CREATE INDEX IF NOT EXISTS capability_snapshots_resource_id_idx
  ON public.capability_snapshots (resource_id);
CREATE INDEX IF NOT EXISTS access_invitations_connection_id_idx
  ON public.access_invitations (connection_id);
CREATE INDEX IF NOT EXISTS access_invitations_created_by_user_id_idx
  ON public.access_invitations (created_by_user_id);
CREATE INDEX IF NOT EXISTS audit_events_actor_user_id_idx
  ON public.audit_events (actor_user_id);

REVOKE ALL ON TABLE private.rate_limit_buckets FROM PUBLIC, anon, authenticated, app_runtime;
ALTER TABLE private.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.consume_rate_limit(
  rate_key_hash text,
  max_hits integer,
  window_seconds integer,
  tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  current_time timestamptz := clock_timestamp();
  current_count integer;
  current_expiry timestamptz;
BEGIN
  IF rate_key_hash !~ '^[a-f0-9]{64}$' OR max_hits < 1 OR max_hits > 10000 OR window_seconds < 1 OR window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit parameters' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.rate_limit_buckets AS bucket (
    key_hash, organization_id, window_started_at, hit_count, expires_at, updated_at
  ) VALUES (
    rate_key_hash,
    tenant_id,
    current_time,
    1,
    current_time + make_interval(secs => window_seconds),
    current_time
  )
  ON CONFLICT (key_hash) DO UPDATE SET
    organization_id = COALESCE(EXCLUDED.organization_id, bucket.organization_id),
    window_started_at = CASE WHEN bucket.expires_at <= current_time THEN current_time ELSE bucket.window_started_at END,
    hit_count = CASE WHEN bucket.expires_at <= current_time THEN 1 ELSE bucket.hit_count + 1 END,
    expires_at = CASE WHEN bucket.expires_at <= current_time THEN current_time + make_interval(secs => window_seconds) ELSE bucket.expires_at END,
    updated_at = current_time
  RETURNING hit_count, expires_at INTO current_count, current_expiry;

  DELETE FROM private.rate_limit_buckets
  WHERE key_hash IN (
    SELECT stale.key_hash
    FROM private.rate_limit_buckets AS stale
    WHERE stale.expires_at < current_time - interval '1 day'
    ORDER BY stale.expires_at
    LIMIT 100
  );

  allowed := current_count <= max_hits;
  retry_after_seconds := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_expiry - current_time)))::integer);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION private.consume_rate_limit(text, integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.consume_rate_limit(text, integer, integer, uuid) TO app_runtime;

-- Scheduled PKCE cleanup runs through the existing broker identity. The caller
-- cannot select OAuth rows or Vault secrets directly; this narrow definer
-- function destroys only terminal/expired PKCE handles and returns safe IDs.
CREATE OR REPLACE FUNCTION private.cleanup_expired_oauth_transactions(batch_limit integer)
RETURNS TABLE(
  transaction_id uuid,
  organization_id uuid,
  provider text,
  connection_id uuid,
  cleanup_outcome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  candidate record;
  secret_was_present boolean;
BEGIN
  IF batch_limit < 1 OR batch_limit > 500 THEN
    RAISE EXCEPTION 'invalid OAuth cleanup batch size' USING ERRCODE = '22023';
  END IF;

  FOR candidate IN
    SELECT oauth.id,
           oauth.organization_id,
           oauth.provider,
           oauth.connection_id,
           oauth.pkce_secret_reference,
           oauth.status
      FROM public.oauth_transactions AS oauth
     WHERE oauth.pkce_secret_reference IS NOT NULL
       AND (
         (oauth.status = 'issued' AND oauth.expires_at <= clock_timestamp())
         OR oauth.status IN ('expired', 'canceled')
         OR (oauth.status = 'consumed' AND oauth.consumed_at <= clock_timestamp() - interval '15 minutes')
       )
     ORDER BY oauth.expires_at, oauth.id
     FOR UPDATE SKIP LOCKED
     LIMIT batch_limit
  LOOP
    transaction_id := candidate.id;
    organization_id := candidate.organization_id;
    provider := candidate.provider;
    connection_id := candidate.connection_id;

    IF candidate.pkce_secret_reference !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      UPDATE public.oauth_transactions
         SET status = CASE WHEN status = 'issued' THEN 'expired' ELSE status END
       WHERE id = candidate.id;
      cleanup_outcome := 'invalid_reference';
      RETURN NEXT;
      CONTINUE;
    END IF;

    DELETE FROM vault.secrets
     WHERE id = candidate.pkce_secret_reference::uuid;
    secret_was_present := FOUND;

    UPDATE public.oauth_transactions
       SET status = CASE WHEN status = 'issued' THEN 'expired' ELSE status END,
           pkce_secret_reference = NULL
     WHERE id = candidate.id;

    cleanup_outcome := CASE WHEN secret_was_present THEN 'destroyed' ELSE 'already_absent' END;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.cleanup_expired_oauth_transactions(integer)
  FROM PUBLIC, anon, authenticated, service_role, app_runtime, app_secret_broker;
GRANT EXECUTE ON FUNCTION private.cleanup_expired_oauth_transactions(integer) TO app_secret_broker;
