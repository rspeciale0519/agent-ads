BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- Supabase advisor "auth_rls_initplan": wrapping current_setting() in a
-- sub-select lets Postgres read the signed-in applicant once per query
-- instead of once per row. The rules themselves are unchanged.
DO $$
BEGIN
  IF to_regclass('public.onboarding_submissions') IS NOT NULL THEN
    ALTER POLICY onboarding_app_runtime_select ON public.onboarding_submissions
      USING (applicant_id = NULLIF((SELECT current_setting('app.current_auth_subject', true)), '')::uuid);
    ALTER POLICY onboarding_app_runtime_insert ON public.onboarding_submissions
      WITH CHECK (applicant_id = NULLIF((SELECT current_setting('app.current_auth_subject', true)), '')::uuid);
    ALTER POLICY onboarding_app_runtime_update ON public.onboarding_submissions
      USING (applicant_id = NULLIF((SELECT current_setting('app.current_auth_subject', true)), '')::uuid)
      WITH CHECK (applicant_id = NULLIF((SELECT current_setting('app.current_auth_subject', true)), '')::uuid);
  END IF;
END
$$;

-- Supabase advisor "unindexed_foreign_keys": one index per foreign key, so
-- checks and deletes on the referenced rows don't scan whole tables.
CREATE INDEX "access_invitations_organization_id_connection_id_idx" ON "public"."access_invitations"("organization_id", "connection_id");
CREATE INDEX "capability_snapshots_connection_id_idx" ON "public"."capability_snapshots"("connection_id");
CREATE INDEX "capability_snapshots_organization_id_resource_id_idx" ON "public"."capability_snapshots"("organization_id", "resource_id");
CREATE INDEX "connection_health_checks_connection_id_idx" ON "public"."connection_health_checks"("connection_id");
CREATE INDEX "connection_resources_connection_id_idx" ON "public"."connection_resources"("connection_id");
CREATE INDEX "connections_organization_id_id_credential_reference_id_idx" ON "public"."connections"("organization_id", "id", "credential_reference_id");
CREATE INDEX "connections_organization_id_request_id_idx" ON "public"."connections"("organization_id", "request_id");
CREATE INDEX "oauth_transactions_organization_id_connection_id_idx" ON "public"."oauth_transactions"("organization_id", "connection_id");

COMMIT;
