BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- AI model keys that are no longer used but still need deleting from
-- Supabase Vault. A handle is queued in the same transaction that stops
-- using it, and removed only after the Vault delete succeeds, so a failed
-- delete is retried instead of leaving the key behind untracked.
CREATE TABLE "private"."organization_ai_credential_cleanups" (
    "broker_handle" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_ai_credential_cleanups_pkey" PRIMARY KEY ("broker_handle")
);

CREATE INDEX "organization_ai_credential_cleanups_organization_id_idx" ON "private"."organization_ai_credential_cleanups"("organization_id");

ALTER TABLE "private"."organization_ai_credential_cleanups" ADD CONSTRAINT "organization_ai_credential_cleanups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE private.organization_ai_credential_cleanups FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE private.organization_ai_credential_cleanups TO app_runtime;

ALTER TABLE private.organization_ai_credential_cleanups ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.organization_ai_credential_cleanups FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_ai_credential_cleanups_select ON private.organization_ai_credential_cleanups
  FOR SELECT TO app_runtime USING (organization_id = private.current_organization_id());
CREATE POLICY organization_ai_credential_cleanups_insert ON private.organization_ai_credential_cleanups
  FOR INSERT TO app_runtime WITH CHECK (organization_id = private.current_organization_id());
CREATE POLICY organization_ai_credential_cleanups_delete ON private.organization_ai_credential_cleanups
  FOR DELETE TO app_runtime USING (organization_id = private.current_organization_id());

COMMIT;
