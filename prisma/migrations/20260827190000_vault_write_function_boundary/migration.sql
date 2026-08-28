BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- An older operations draft allowed these stable permission roles to log in.
-- Stop before changing grants until an operator completes the documented
-- expand-and-contract cutover to separate login principals.
DO $permission_role_login_guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname IN ('app_runtime', 'app_secret_broker')
      AND rolcanlogin
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'ACCOUNT_CONNECTIONS_PERMISSION_ROLE_LOGIN_ENABLED',
      DETAIL = 'Stable application permission roles must be NOLOGIN before this migration.',
      HINT = 'Cut over to separate runtime and broker login principals, verify them, and disable LOGIN on the permission roles.';
  END IF;
END
$permission_role_login_guard$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Keep Vault
-- writes behind the dedicated broker permission role.
REVOKE ALL ON FUNCTION vault.create_secret(text, text, text, uuid) FROM PUBLIC, anon, authenticated, service_role, app_runtime, app_secret_broker;
REVOKE ALL ON FUNCTION vault.update_secret(uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated, service_role, app_runtime, app_secret_broker;

GRANT EXECUTE ON FUNCTION vault.create_secret(text, text, text, uuid) TO app_secret_broker;
GRANT EXECUTE ON FUNCTION vault.update_secret(uuid, text, text, text, uuid) TO app_secret_broker;

COMMIT;
