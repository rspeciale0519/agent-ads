-- Add the Prisma runtime boundary to the legacy onboarding table without
-- changing its existing schema or applicant-facing policy.
DO $$
BEGIN
  IF to_regclass('public.onboarding_submissions') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE public.onboarding_submissions TO app_runtime;
    ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.onboarding_submissions FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS onboarding_app_runtime_select ON public.onboarding_submissions;
    DROP POLICY IF EXISTS onboarding_app_runtime_insert ON public.onboarding_submissions;
    DROP POLICY IF EXISTS onboarding_app_runtime_update ON public.onboarding_submissions;
    CREATE POLICY onboarding_app_runtime_select ON public.onboarding_submissions
      FOR SELECT TO app_runtime
      USING (applicant_id = NULLIF(current_setting('app.current_auth_subject', true), '')::uuid);
    CREATE POLICY onboarding_app_runtime_insert ON public.onboarding_submissions
      FOR INSERT TO app_runtime
      WITH CHECK (applicant_id = NULLIF(current_setting('app.current_auth_subject', true), '')::uuid);
    CREATE POLICY onboarding_app_runtime_update ON public.onboarding_submissions
      FOR UPDATE TO app_runtime
      USING (applicant_id = NULLIF(current_setting('app.current_auth_subject', true), '')::uuid)
      WITH CHECK (applicant_id = NULLIF(current_setting('app.current_auth_subject', true), '')::uuid);
    REVOKE ALL ON TABLE public.onboarding_submissions FROM anon, authenticated;
  END IF;
END
$$;
