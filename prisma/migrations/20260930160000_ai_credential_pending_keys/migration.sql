BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- AI model keys that are about to be written to Supabase Vault. The Vault
-- secret's name is chosen first and recorded here (under the organization's
-- shared lock, so offboarding cannot finish in between); only then is the
-- key written under that name. The row is removed in the same transaction
-- that saves the key, or after the unused key is deleted by name. Until
-- then, offboarding counts it and will not finish, so no key is ever left
-- in the Vault without a record pointing to it.
CREATE TABLE "private"."organization_ai_credential_pending_keys" (
    "vault_name" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_ai_credential_pending_keys_pkey" PRIMARY KEY ("vault_name")
);

CREATE INDEX "organization_ai_credential_pending_keys_organization_id_idx" ON "private"."organization_ai_credential_pending_keys"("organization_id");

ALTER TABLE "private"."organization_ai_credential_pending_keys" ADD CONSTRAINT "organization_ai_credential_pending_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE private.organization_ai_credential_pending_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE private.organization_ai_credential_pending_keys TO app_runtime;

ALTER TABLE private.organization_ai_credential_pending_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.organization_ai_credential_pending_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_ai_credential_pending_keys_select ON private.organization_ai_credential_pending_keys
  FOR SELECT TO app_runtime USING (organization_id = private.current_organization_id());
CREATE POLICY organization_ai_credential_pending_keys_insert ON private.organization_ai_credential_pending_keys
  FOR INSERT TO app_runtime WITH CHECK (organization_id = private.current_organization_id());
CREATE POLICY organization_ai_credential_pending_keys_delete ON private.organization_ai_credential_pending_keys
  FOR DELETE TO app_runtime USING (organization_id = private.current_organization_id());

-- Deletes a Vault secret by the name it was created with. Only the secret
-- broker role may call it; deleting a name that was never written is a no-op.
CREATE OR REPLACE FUNCTION private.destroy_broker_secret_by_name(secret_name text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, private, vault
AS $$
  DELETE FROM vault.secrets WHERE name = secret_name
$$;

REVOKE ALL ON FUNCTION private.destroy_broker_secret_by_name(text) FROM PUBLIC, anon, authenticated, app_runtime;
GRANT EXECUTE ON FUNCTION private.destroy_broker_secret_by_name(text) TO app_secret_broker;

COMMIT;
