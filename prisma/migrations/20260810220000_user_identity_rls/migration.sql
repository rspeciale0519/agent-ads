-- User identity rows are global records, but application access must still be
-- bound to the authenticated Supabase subject. Organization-scoped records
-- continue to use private.current_organization_id().
CREATE OR REPLACE FUNCTION private.current_auth_subject()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, private
AS $$
  SELECT NULLIF(current_setting('app.current_auth_subject', true), '')::uuid
$$;

REVOKE ALL ON FUNCTION private.current_auth_subject() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_auth_subject() TO app_runtime;

REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO app_runtime;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select ON public.users;
DROP POLICY IF EXISTS users_insert ON public.users;
DROP POLICY IF EXISTS users_update ON public.users;

CREATE POLICY users_select ON public.users
  FOR SELECT TO app_runtime
  USING (auth_subject = private.current_auth_subject());

CREATE POLICY users_insert ON public.users
  FOR INSERT TO app_runtime
  WITH CHECK (auth_subject = private.current_auth_subject());

CREATE POLICY users_update ON public.users
  FOR UPDATE TO app_runtime
  USING (auth_subject = private.current_auth_subject())
  WITH CHECK (auth_subject = private.current_auth_subject());
