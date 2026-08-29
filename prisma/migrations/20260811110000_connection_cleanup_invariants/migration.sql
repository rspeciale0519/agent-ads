-- Make credential cleanup explicit and reconnect-safe. Existing references must
-- be attributable to a connection before the invariant is made mandatory.
ALTER TABLE private.credential_references
  ADD COLUMN IF NOT EXISTS connection_id uuid,
  ADD COLUMN IF NOT EXISTS cleanup_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cleanup_lease_expires_at timestamptz;

UPDATE private.credential_references AS reference
SET connection_id = connection.id
FROM public.connections AS connection
WHERE connection.credential_reference_id = reference.id
  AND connection.organization_id = reference.organization_id
  AND reference.connection_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.credential_references WHERE connection_id IS NULL) THEN
    RAISE EXCEPTION 'credential reference connection backfill incomplete; reconcile orphaned broker handles before retrying';
  END IF;
END
$$;

ALTER TABLE private.credential_references
  ALTER COLUMN connection_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS credential_references_cleanup_status_check,
  ADD CONSTRAINT credential_references_cleanup_status_check
    CHECK (cleanup_status IN ('active', 'cleanup_pending', 'cleanup_in_progress', 'destroyed')),
  DROP CONSTRAINT IF EXISTS credential_references_cleanup_state_check,
  ADD CONSTRAINT credential_references_cleanup_state_check
    CHECK (
      (cleanup_status = 'cleanup_in_progress' AND cleanup_lease_expires_at IS NOT NULL)
      OR (cleanup_status <> 'cleanup_in_progress' AND cleanup_lease_expires_at IS NULL)
    ),
  DROP CONSTRAINT IF EXISTS credential_references_destroyed_state_check,
  ADD CONSTRAINT credential_references_destroyed_state_check
    CHECK (cleanup_status <> 'destroyed' OR revoked_at IS NOT NULL);

CREATE INDEX IF NOT EXISTS credential_references_connection_cleanup_idx
  ON private.credential_references (organization_id, connection_id, cleanup_status);

CREATE INDEX IF NOT EXISTS credential_references_cleanup_lease_idx
  ON private.credential_references (cleanup_status, cleanup_lease_expires_at)
  WHERE cleanup_status = 'cleanup_in_progress';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'credential_references_organization_connection_fkey'
      AND conrelid = 'private.credential_references'::regclass
  ) THEN
    ALTER TABLE private.credential_references
      ADD CONSTRAINT credential_references_organization_connection_fkey
      FOREIGN KEY (organization_id, connection_id)
      REFERENCES public.connections (organization_id, id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- Only the low-privilege application role can see/update its tenant's safe
-- reference metadata; broker handles remain unusable without the broker role.
DROP POLICY IF EXISTS credential_references_select ON private.credential_references;
DROP POLICY IF EXISTS credential_references_insert ON private.credential_references;
DROP POLICY IF EXISTS credential_references_update ON private.credential_references;

CREATE POLICY credential_references_select ON private.credential_references
  FOR SELECT TO app_runtime
  USING (organization_id = private.current_organization_id());
CREATE POLICY credential_references_insert ON private.credential_references
  FOR INSERT TO app_runtime
  WITH CHECK (organization_id = private.current_organization_id());
CREATE POLICY credential_references_update ON private.credential_references
  FOR UPDATE TO app_runtime
  USING (organization_id = private.current_organization_id())
  WITH CHECK (organization_id = private.current_organization_id());
