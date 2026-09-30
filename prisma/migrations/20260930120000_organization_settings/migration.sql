BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- Settings an organization's owners and administrators can change.
-- One row per organization; a missing row means every default applies.
CREATE TABLE "public"."organization_settings" (
    "organization_id" UUID NOT NULL,
    -- Days an uploaded export stays current before AI Reach asks for a new one.
    "stale_upload_days" INTEGER NOT NULL DEFAULT 7,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("organization_id"),
    CONSTRAINT "organization_settings_stale_upload_days_check" CHECK ("stale_upload_days" BETWEEN 1 AND 90)
);

ALTER TABLE "public"."organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE public.organization_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.organization_settings TO app_runtime;

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings FORCE ROW LEVEL SECURITY;
-- Rows are visible and writable only inside their own organization, and the
-- recorded editor must be the signed-in user. Roles are checked in the app.
CREATE POLICY organization_settings_select ON public.organization_settings
  FOR SELECT TO app_runtime USING (organization_id = private.current_organization_id());
CREATE POLICY organization_settings_insert ON public.organization_settings
  FOR INSERT TO app_runtime
  WITH CHECK (organization_id = private.current_organization_id() AND updated_by = private.current_actor_id());
CREATE POLICY organization_settings_update ON public.organization_settings
  FOR UPDATE TO app_runtime
  USING (organization_id = private.current_organization_id())
  WITH CHECK (organization_id = private.current_organization_id() AND updated_by = private.current_actor_id());

COMMIT;
