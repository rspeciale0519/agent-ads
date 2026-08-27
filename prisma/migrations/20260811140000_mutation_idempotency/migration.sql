CREATE TABLE private.idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  key_hash text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  failed_at timestamptz,
  CONSTRAINT idempotency_records_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT idempotency_records_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT idempotency_records_action_check
    CHECK (action ~ '^[a-z0-9._:-]{1,120}$'),
  CONSTRAINT idempotency_records_key_hash_check
    CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT idempotency_records_request_hash_check
    CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT idempotency_records_status_check
    CHECK (status IN ('pending', 'completed', 'failed')),
  CONSTRAINT idempotency_records_terminal_state_check
    CHECK (
      (status = 'pending' AND completed_at IS NULL AND failed_at IS NULL)
      OR (status = 'completed' AND completed_at IS NOT NULL AND failed_at IS NULL)
      OR (status = 'failed' AND completed_at IS NULL AND failed_at IS NOT NULL)
    ),
  CONSTRAINT idempotency_records_scope_key_key
    UNIQUE (organization_id, user_id, action, key_hash)
);

CREATE INDEX idempotency_records_organization_user_expires_idx
  ON private.idempotency_records (organization_id, user_id, expires_at);
CREATE INDEX idempotency_records_organization_status_updated_idx
  ON private.idempotency_records (organization_id, status, updated_at);
CREATE INDEX idempotency_records_user_id_idx
  ON private.idempotency_records (user_id);
CREATE INDEX idempotency_records_expires_at_idx
  ON private.idempotency_records (expires_at);

REVOKE ALL ON TABLE private.idempotency_records FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE private.idempotency_records TO app_runtime;
ALTER TABLE private.idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.idempotency_records FORCE ROW LEVEL SECURITY;

CREATE POLICY idempotency_records_select
  ON private.idempotency_records
  FOR SELECT TO app_runtime
  USING (
    organization_id = private.current_organization_id()
    AND user_id = private.current_actor_id()
  );

CREATE POLICY idempotency_records_insert
  ON private.idempotency_records
  FOR INSERT TO app_runtime
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND user_id = private.current_actor_id()
  );

CREATE POLICY idempotency_records_update
  ON private.idempotency_records
  FOR UPDATE TO app_runtime
  USING (
    organization_id = private.current_organization_id()
    AND user_id = private.current_actor_id()
  )
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND user_id = private.current_actor_id()
  );

CREATE OR REPLACE FUNCTION private.cleanup_expired_idempotency_records(batch_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF batch_limit < 1 OR batch_limit > 1000 THEN
    RAISE EXCEPTION 'invalid batch limit';
  END IF;

  WITH expired AS (
    SELECT records.id
      FROM private.idempotency_records AS records
     WHERE records.expires_at <= statement_timestamp()
     ORDER BY records.expires_at, records.id
     FOR UPDATE SKIP LOCKED
     LIMIT batch_limit
  )
  DELETE FROM private.idempotency_records AS records
   USING expired
   WHERE records.id = expired.id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION private.cleanup_expired_idempotency_records(integer)
  FROM PUBLIC, anon, authenticated, service_role, app_runtime, app_secret_broker;
GRANT EXECUTE ON FUNCTION private.cleanup_expired_idempotency_records(integer)
  TO app_secret_broker;
