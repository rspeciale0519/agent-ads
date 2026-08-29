-- Bind sensitive operations to a currently persisted Supabase Auth session.
-- The dynamic query keeps this migration installable in synthetic/local
-- databases that do not provision the managed auth schema; those databases
-- fail closed until auth.sessions is available.
CREATE OR REPLACE FUNCTION private.is_active_auth_session(auth_subject text, session_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  active boolean := false;
BEGIN
  IF auth_subject IS NULL OR session_id IS NULL OR auth_subject = '' OR session_id = '' THEN
    RETURN false;
  END IF;

  IF to_regclass('auth.sessions') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE 'SELECT EXISTS (SELECT 1 FROM auth.sessions WHERE id::text = $1 AND user_id::text = $2)'
    INTO active
    USING session_id, auth_subject;
  RETURN active;
END;
$$;

REVOKE ALL ON FUNCTION private.is_active_auth_session(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_auth_session(text, text) TO app_runtime;
