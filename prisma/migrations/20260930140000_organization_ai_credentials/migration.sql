BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- The AI model an organization chose for AI Reach, and a handle to its API
-- key. The key itself lives only in Supabase Vault; this row holds the
-- broker handle, a fingerprint, and the last four characters for display.
CREATE TABLE "private"."organization_ai_credentials" (
    "organization_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "broker_handle" TEXT NOT NULL,
    "backend" TEXT NOT NULL,
    "key_version" TEXT NOT NULL,
    "key_hint" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_ai_credentials_pkey" PRIMARY KEY ("organization_id"),
    CONSTRAINT "organization_ai_credentials_provider_check"
      CHECK ("provider" IN ('anthropic', 'openai', 'google', 'mistral', 'groq', 'xai', 'deepseek', 'together', 'openrouter')),
    CONSTRAINT "organization_ai_credentials_model_check" CHECK ("model" ~ '^[A-Za-z0-9._:/@-]{1,200}$'),
    CONSTRAINT "organization_ai_credentials_key_hint_check" CHECK (char_length("key_hint") <= 4)
);

CREATE UNIQUE INDEX "organization_ai_credentials_broker_handle_key" ON "private"."organization_ai_credentials"("broker_handle");

ALTER TABLE "private"."organization_ai_credentials" ADD CONSTRAINT "organization_ai_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE private.organization_ai_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.organization_ai_credentials TO app_runtime;

ALTER TABLE private.organization_ai_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.organization_ai_credentials FORCE ROW LEVEL SECURITY;
-- Rows are visible and writable only inside their own organization, and the
-- recorded editor must be the signed-in user. Roles are checked in the app.
CREATE POLICY organization_ai_credentials_select ON private.organization_ai_credentials
  FOR SELECT TO app_runtime USING (organization_id = private.current_organization_id());
CREATE POLICY organization_ai_credentials_insert ON private.organization_ai_credentials
  FOR INSERT TO app_runtime
  WITH CHECK (organization_id = private.current_organization_id() AND updated_by = private.current_actor_id());
CREATE POLICY organization_ai_credentials_update ON private.organization_ai_credentials
  FOR UPDATE TO app_runtime
  USING (organization_id = private.current_organization_id())
  WITH CHECK (organization_id = private.current_organization_id() AND updated_by = private.current_actor_id());
CREATE POLICY organization_ai_credentials_delete ON private.organization_ai_credentials
  FOR DELETE TO app_runtime USING (organization_id = private.current_organization_id());

COMMIT;
