-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "private";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "time_zone" TEXT NOT NULL DEFAULT 'UTC',
    "retention_days" INTEGER NOT NULL DEFAULT 365,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "auth_subject" UUID NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "invited_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "inviter_user_id" UUID NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_auth_subject" UUID,
    "token_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "permissions" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "accepted_by_user_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private"."step_up_grants" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" TEXT NOT NULL,
    "action_class" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_up_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."connection_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "system" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "product" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'inventory',
    "known_identifiers" JSONB NOT NULL,
    "ownership_status" TEXT NOT NULL,
    "preferred_method" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."connections" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "request_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "product" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'reporting',
    "authorization_method" TEXT NOT NULL,
    "principal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "access_mode" TEXT NOT NULL DEFAULT 'read_only',
    "credential_reference_id" TEXT,
    "granted_scopes" TEXT[],
    "effective_role" TEXT,
    "expires_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."connection_resources" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "resource_type" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "metadata" JSONB,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "eligibility" TEXT NOT NULL DEFAULT 'unknown',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."capability_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "resource_id" UUID,
    "connector_version" TEXT NOT NULL,
    "capability_key" TEXT NOT NULL,
    "support_level" TEXT NOT NULL,
    "limitation" TEXT,
    "evidence_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capability_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."connection_health_checks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "check_kind" TEXT NOT NULL,
    "outcome_code" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latency_ms" INTEGER,
    "remediation_code" TEXT,
    "diagnostic_ref" TEXT,

    CONSTRAINT "connection_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_transactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "connection_id" UUID,
    "provider" TEXT NOT NULL,
    "state_hash" TEXT NOT NULL,
    "pkce_secret_reference" TEXT,
    "return_path" TEXT NOT NULL,
    "browser_transaction_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."access_invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "connection_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "expected_principal" TEXT NOT NULL,
    "external_account_id" TEXT,
    "instructions" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "access_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private"."credential_references" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "broker_handle" TEXT NOT NULL,
    "backend" TEXT NOT NULL,
    "credential_kind" TEXT NOT NULL,
    "key_version" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "fingerprint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credential_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "correlation_id" TEXT NOT NULL,
    "causation_id" TEXT,
    "outcome_code" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "previous_hash" TEXT,
    "integrity_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "public"."organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_status_updated_at_idx" ON "public"."organizations"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_subject_key" ON "public"."users"("auth_subject");

-- CreateIndex
CREATE INDEX "memberships_organization_id_status_idx" ON "public"."memberships"("organization_id", "status");

-- CreateIndex
CREATE INDEX "memberships_user_id_status_idx" ON "public"."memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_user_id_key" ON "public"."memberships"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invitations_token_hash_key" ON "public"."organization_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "organization_invitations_organization_id_status_expires_at_idx" ON "public"."organization_invitations"("organization_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "organization_invitations_recipient_email_status_idx" ON "public"."organization_invitations"("recipient_email", "status");

-- CreateIndex
CREATE INDEX "step_up_grants_organization_id_user_id_action_class_expires_idx" ON "private"."step_up_grants"("organization_id", "user_id", "action_class", "expires_at");

-- CreateIndex
CREATE INDEX "step_up_grants_session_id_expires_at_idx" ON "private"."step_up_grants"("session_id", "expires_at");

-- CreateIndex
CREATE INDEX "connection_requests_organization_id_state_updated_at_idx" ON "public"."connection_requests"("organization_id", "state", "updated_at");

-- CreateIndex
CREATE INDEX "connection_requests_organization_id_provider_created_at_idx" ON "public"."connection_requests"("organization_id", "provider", "created_at");

-- CreateIndex
CREATE INDEX "connections_organization_id_status_updated_at_idx" ON "public"."connections"("organization_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "connections_organization_id_provider_created_at_idx" ON "public"."connections"("organization_id", "provider", "created_at");

-- CreateIndex
CREATE INDEX "connections_credential_reference_id_idx" ON "public"."connections"("credential_reference_id");

-- CreateIndex
CREATE INDEX "connection_resources_organization_id_selected_updated_at_idx" ON "public"."connection_resources"("organization_id", "selected", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "connection_resources_organization_id_connection_id_resource_key" ON "public"."connection_resources"("organization_id", "connection_id", "resource_type", "external_id");

-- CreateIndex
CREATE INDEX "capability_snapshots_organization_id_connection_id_evidence_idx" ON "public"."capability_snapshots"("organization_id", "connection_id", "evidence_at");

-- CreateIndex
CREATE INDEX "connection_health_checks_organization_id_connection_id_chec_idx" ON "public"."connection_health_checks"("organization_id", "connection_id", "checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_transactions_state_hash_key" ON "public"."oauth_transactions"("state_hash");

-- CreateIndex
CREATE INDEX "oauth_transactions_organization_id_user_id_provider_status__idx" ON "public"."oauth_transactions"("organization_id", "user_id", "provider", "status", "expires_at");

-- CreateIndex
CREATE INDEX "oauth_transactions_connection_id_status_idx" ON "public"."oauth_transactions"("connection_id", "status");

-- CreateIndex
CREATE INDEX "access_invitations_organization_id_status_expires_at_idx" ON "public"."access_invitations"("organization_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "credential_references_broker_handle_key" ON "private"."credential_references"("broker_handle");

CREATE INDEX "credential_references_organization_id_idx" ON "private"."credential_references"("organization_id");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_created_at_idx" ON "public"."audit_events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_resource_type_resource_id_idx" ON "public"."audit_events"("organization_id", "resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_invitations" ADD CONSTRAINT "organization_invitations_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_invitations" ADD CONSTRAINT "organization_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."connection_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connection_resources" ADD CONSTRAINT "connection_resources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connection_resources" ADD CONSTRAINT "connection_resources_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."capability_snapshots" ADD CONSTRAINT "capability_snapshots_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."capability_snapshots" ADD CONSTRAINT "capability_snapshots_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."connection_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connection_health_checks" ADD CONSTRAINT "connection_health_checks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connection_health_checks" ADD CONSTRAINT "connection_health_checks_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."access_invitations" ADD CONSTRAINT "access_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."access_invitations" ADD CONSTRAINT "access_invitations_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."access_invitations" ADD CONSTRAINT "access_invitations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private"."credential_references" ADD CONSTRAINT "credential_references_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Account Connections security boundary. This migration owns the new policies,
-- grants, constraints, and tenant-context helper; legacy Supabase tables remain
-- under their existing migrations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_secret_broker') THEN
    CREATE ROLE app_secret_broker NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

REVOKE ALL ON TABLE
  public.organizations,
  public.users,
  public.memberships,
  public.organization_invitations,
  public.connection_requests,
  public.connections,
  public.connection_resources,
  public.capability_snapshots,
  public.connection_health_checks,
  public.oauth_transactions,
  public.access_invitations,
  public.audit_events
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO app_runtime;
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.organizations,
  public.users,
  public.memberships,
  public.organization_invitations,
  public.connection_requests,
  public.connections,
  public.connection_resources,
  public.capability_snapshots,
  public.connection_health_checks,
  public.oauth_transactions,
  public.access_invitations
TO app_runtime;
GRANT SELECT, INSERT ON TABLE public.audit_events TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE private.step_up_grants, private.credential_references TO app_runtime;

CREATE OR REPLACE FUNCTION private.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, private
AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION private.current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, private
AS $$
  SELECT NULLIF(current_setting('app.current_actor_id', true), '')::uuid
$$;

REVOKE ALL ON FUNCTION private.current_organization_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.current_actor_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_organization_id() TO app_runtime;
GRANT EXECUTE ON FUNCTION private.current_actor_id() TO app_runtime;

-- Vault ciphertext remains inaccessible to application roles. The broker may
-- create/update through the approved Vault functions and may read/destroy only
-- through these narrow, owner-controlled wrappers.
CREATE OR REPLACE FUNCTION private.read_broker_secret(secret_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, private, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id
$$;

CREATE OR REPLACE FUNCTION private.destroy_broker_secret(secret_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, private, vault
AS $$
  DELETE FROM vault.secrets WHERE id = secret_id
$$;

REVOKE ALL ON FUNCTION private.read_broker_secret(uuid) FROM PUBLIC, anon, authenticated, app_runtime;
REVOKE ALL ON FUNCTION private.destroy_broker_secret(uuid) FROM PUBLIC, anon, authenticated, app_runtime;
GRANT USAGE ON SCHEMA private TO app_secret_broker;
GRANT USAGE ON SCHEMA vault TO app_secret_broker;
GRANT EXECUTE ON FUNCTION private.read_broker_secret(uuid) TO app_secret_broker;
GRANT EXECUTE ON FUNCTION private.destroy_broker_secret(uuid) TO app_secret_broker;
GRANT EXECUTE ON FUNCTION vault.create_secret(text, text, text, uuid) TO app_secret_broker;
GRANT EXECUTE ON FUNCTION vault.update_secret(uuid, text, text, text, uuid) TO app_secret_broker;

CREATE OR REPLACE FUNCTION private.lookup_organization_invitation(invitation_token_hash text)
RETURNS TABLE(invitation_id uuid, organization_id uuid, organization_name text, recipient_email text, recipient_auth_subject uuid, role text, permissions text[], status text, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT organization_invitations.id,
         organization_invitations.organization_id,
         organizations.name,
         organization_invitations.recipient_email,
         organization_invitations.recipient_auth_subject,
         organization_invitations.role,
         organization_invitations.permissions,
         organization_invitations.status,
         organization_invitations.expires_at
    FROM public.organization_invitations
    JOIN public.organizations ON organizations.id = organization_invitations.organization_id
   WHERE organization_invitations.token_hash = invitation_token_hash
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION private.lookup_organization_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.lookup_organization_invitation(text) TO app_runtime;

CREATE OR REPLACE FUNCTION private.list_user_organizations(auth_subject uuid)
RETURNS TABLE(id uuid, name text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT organizations.id, organizations.name, memberships.role
    FROM public.memberships
    JOIN public.users ON users.id = memberships.user_id
    JOIN public.organizations ON organizations.id = memberships.organization_id
   WHERE users.auth_subject = auth_subject AND memberships.status = 'active' AND organizations.status = 'active'
   ORDER BY organizations.name
$$;
REVOKE ALL ON FUNCTION private.list_user_organizations(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.list_user_organizations(uuid) TO app_runtime;

DO $$
DECLARE
  policy_table text;
  tenant_column text;
  row_definition record;
BEGIN
  FOR row_definition IN
    SELECT * FROM (VALUES
      ('organizations', 'id'),
      ('memberships', 'organization_id'),
      ('organization_invitations', 'organization_id'),
      ('connection_requests', 'organization_id'),
      ('connections', 'organization_id'),
      ('connection_resources', 'organization_id'),
      ('capability_snapshots', 'organization_id'),
      ('connection_health_checks', 'organization_id'),
      ('oauth_transactions', 'organization_id'),
      ('access_invitations', 'organization_id'),
      ('audit_events', 'organization_id')
    ) AS definitions(policy_table, tenant_column)
  LOOP
    policy_table := row_definition.policy_table;
    tenant_column := row_definition.tenant_column;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', policy_table);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', policy_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', policy_table, policy_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', policy_table, policy_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', policy_table, policy_table);
    EXECUTE format(
      'CREATE POLICY %I_select ON public.%I FOR SELECT TO app_runtime USING (%I = private.current_organization_id())',
      policy_table, policy_table, tenant_column
    );
    IF policy_table <> 'audit_events' THEN
      EXECUTE format(
        'CREATE POLICY %I_insert ON public.%I FOR INSERT TO app_runtime WITH CHECK (%I = private.current_organization_id())',
        policy_table, policy_table, tenant_column
      );
      EXECUTE format(
        'CREATE POLICY %I_update ON public.%I FOR UPDATE TO app_runtime USING (%I = private.current_organization_id()) WITH CHECK (%I = private.current_organization_id())',
        policy_table, policy_table, tenant_column, tenant_column
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I_insert ON public.%I FOR INSERT TO app_runtime WITH CHECK (%I = private.current_organization_id())',
        policy_table, policy_table, tenant_column
      );
    END IF;
  END LOOP;
END
$$;

DO $$
BEGIN
  ALTER TABLE private.step_up_grants ENABLE ROW LEVEL SECURITY;
  ALTER TABLE private.step_up_grants FORCE ROW LEVEL SECURITY;
  ALTER TABLE private.credential_references ENABLE ROW LEVEL SECURITY;
  ALTER TABLE private.credential_references FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS step_up_grants_select ON private.step_up_grants;
  DROP POLICY IF EXISTS step_up_grants_insert ON private.step_up_grants;
  DROP POLICY IF EXISTS step_up_grants_update ON private.step_up_grants;
  CREATE POLICY step_up_grants_select ON private.step_up_grants FOR SELECT TO app_runtime USING (organization_id = private.current_organization_id());
  CREATE POLICY step_up_grants_insert ON private.step_up_grants FOR INSERT TO app_runtime WITH CHECK (organization_id = private.current_organization_id());
  CREATE POLICY step_up_grants_update ON private.step_up_grants FOR UPDATE TO app_runtime USING (organization_id = private.current_organization_id()) WITH CHECK (organization_id = private.current_organization_id());
  DROP POLICY IF EXISTS credential_references_select ON private.credential_references;
  DROP POLICY IF EXISTS credential_references_insert ON private.credential_references;
  DROP POLICY IF EXISTS credential_references_update ON private.credential_references;
  CREATE POLICY credential_references_select ON private.credential_references FOR SELECT TO app_runtime USING (organization_id = private.current_organization_id());
  CREATE POLICY credential_references_insert ON private.credential_references FOR INSERT TO app_runtime WITH CHECK (organization_id = private.current_organization_id());
  CREATE POLICY credential_references_update ON private.credential_references FOR UPDATE TO app_runtime USING (organization_id = private.current_organization_id()) WITH CHECK (organization_id = private.current_organization_id());
END
$$;

ALTER TABLE public.connections
  ADD CONSTRAINT connections_read_only_access_check CHECK (access_mode IN ('read_only', 'read_only_pending')),
  ADD CONSTRAINT connections_status_check CHECK (status IN ('pending', 'authorizing', 'discovering', 'verifying', 'active_read_only', 'degraded', 'expired', 'revoked', 'archived'));
ALTER TABLE public.connection_requests
  ADD CONSTRAINT connection_requests_state_check CHECK (state IN ('draft', 'ready', 'awaiting_authorization', 'authorizing', 'discovering', 'selection_required', 'verifying', 'completed', 'attention_required', 'archived'));
ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));
ALTER TABLE public.oauth_transactions
  ADD CONSTRAINT oauth_transactions_status_check CHECK (status IN ('issued', 'consumed', 'expired', 'canceled'));
ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_append_only_metadata_check CHECK (jsonb_typeof(metadata) = 'object');

CREATE UNIQUE INDEX IF NOT EXISTS connections_active_credential_idx
  ON public.connections (organization_id, credential_reference_id)
  WHERE credential_reference_id IS NOT NULL AND archived_at IS NULL AND status NOT IN ('revoked', 'archived');
CREATE INDEX IF NOT EXISTS oauth_transactions_expiry_idx
  ON public.oauth_transactions (expires_at)
  WHERE status = 'issued';
